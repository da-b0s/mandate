// The task loop: classify, plan candidates, decide with policy + recalled value,
// buy what passes, answer, and leave a receipt.
import { createHash, randomUUID } from "node:crypto";
import { applyPreferences, decide, rankCandidates } from "@mandate/policy";
import { readGrant, screenAddress } from "@mandate/chain";
import { loadReceipt, saveReceipt } from "@mandate/store";
import { classify, SERVICES, TASK_VALUE } from "./catalog.js";
import { GrantDenied, guardedPurchase } from "./pay.js";
import { NS, recallPreferences, recallValue, rememberAsync, rememberRating } from "./memory.js";
import { writeAnswer } from "./answer.js";
import { archiveReport } from "./archive.js";
import { activeGrantId } from "./mandate.js";

export { loadReceipt };

export async function runTask({ ask, grantId, useMemory = true, onStep = () => {} }) {
  grantId ??= await activeGrantId();
  const taskId = randomUUID().slice(0, 8);
  const steps = [];
  const log = (s) => {
    const e = { at: new Date().toISOString(), ...s };
    steps.push(e);
    onStep(e);
  };
  const task = classify(ask);
  log({ step: "classified", type: task.type, subject: task.subject });

  const receipt = { taskId, ask, task, useMemory, grantId, plan: [], memoriesUsed: [], payments: [], skipped: [], denied: [], outputs: {}, steps };
  if (task.type === "unknown") {
    receipt.answer = "I need a 0x wallet or token address to work on.";
    await saveReceipt(receipt);
    return receipt;
  }

  const now = Date.now();
  const grant = await readGrant(grantId);

  // Free Tatum read first (blueprint 7.1): a flagged address needs no paid report to answer "don't".
  let freeSufficient = false;
  if (task.type === "wallet-risk") {
    try {
      const screen = await screenAddress(task.subject);
      log({ step: "free-read", source: "Tatum security API", flagged: screen.flagged, list: screen.source });
      if (screen.flagged) {
        freeSufficient = true;
        receipt.outputs["tatum-free"] = {
          ...screen,
          summary: `Flagged by ${screen.source}: ${screen.description}. Do not transact.`,
          sources: ["Tatum security API (free)"],
        };
      }
    } catch (e) {
      log({ step: "free-read-failed", error: String(e.message ?? e).slice(0, 120) });
    }
  }
  const cands = SERVICES.filter((s) => s.taskTypes.includes(task.type));
  const history = {};
  for (const c of cands) {
    const v = useMemory ? await recallValue(c.service, task.type) : { obs: [], blobId: null };
    history[c.service] = v.obs;
    if (v.blobId) receipt.memoriesUsed.push({ service: c.service, blobId: v.blobId, observations: v.obs.length });
  }
  // Preferences from memory (analyze()); they can only make the agent spend less.
  const prefs = useMemory ? await recallPreferences().catch(() => []) : [];
  if (prefs.length) log({ step: "preferences", count: prefs.length });

  const ordered = useMemory ? rankCandidates(cands.map((c) => ({ ...c, payee: "" })), (c) => history[c.service], now) : cands;
  receipt.plan = ordered.map((c) => c.service);
  log({ step: "planned", plan: receipt.plan });

  for (const c of ordered) {
    // Value decision first. The payee is only known from the live quote, so grant limits are checked there.
    const d = decide({
      grant,
      candidate: { service: c.service, payee: "*", price: c.price, taskType: task.type, freeSourceSufficient: freeSufficient },
      history: history[c.service],
      taskValue: TASK_VALUE[task.type],
      nowMs: now,
      useMemory,
    });
    const pref = d.action === "pay" ? applyPreferences(c.service, c.price, prefs) : { skip: false };
    if (pref.skip) {
      receipt.skipped.push({ service: c.service, reason: "preference", detail: pref.reason });
      if (pref.fact?.blobId) receipt.memoriesUsed.push({ service: "preferences", blobId: pref.fact.blobId, observations: 1 });
      log({ step: "skipped", service: c.service, reason: "preference", detail: pref.reason });
      continue;
    }
    if (d.action !== "pay") {
      receipt[d.action === "skipped" ? "skipped" : "denied"].push({ service: c.service, reason: d.reason, detail: d.detail });
      log({ step: d.action, service: c.service, reason: d.reason, detail: d.detail });
      continue;
    }
    try {
      log({ step: "buying", service: c.service, price: c.price });
      const r = await guardedPurchase({ grantId, url: c.url(task), expectedPrice: c.price, log: (s) => log({ service: c.service, ...s }) });
      if (r.payment) receipt.payments.push({ service: c.service, ...r.payment, delivered: r.status === 200 });
      receipt.outputs[c.service] = r.body;
      if (r.status !== 200) log({ step: "delivery-failed", service: c.service, status: r.status, refundWorthy: Boolean(r.payment) });
    } catch (e) {
      if (!(e instanceof GrantDenied)) throw e;
      receipt.denied.push({ service: c.service, reason: e.reason, detail: e.detail });
      log({ step: "denied", service: c.service, reason: e.reason, detail: e.detail });
    }
  }

  log({ step: "answering" });
  const answer = await writeAnswer({ ask, outputs: receipt.outputs, skipped: receipt.skipped });
  receipt.answer = answer.text;
  receipt.answerModel = answer.model;
  receipt.outputHash = createHash("sha256").update(JSON.stringify(receipt.outputs)).digest("hex");
  receipt.totalSpent = receipt.payments.reduce((s, p) => s + p.amount, 0);
  await saveReceipt(receipt);

  // Full report (every step and vendor output) archived on Walrus via Tatum; the receipt memory cites it.
  receipt.report = await archiveReport(receipt);
  if (receipt.report) log({ step: "archived", blobId: receipt.report.blobId });

  receipt.memoryJob = await rememberAsync(NS.receipts, "receipt", taskId, {
    ask,
    type: task.type,
    plan: receipt.plan,
    memories: receipt.memoriesUsed.map((m) => m.blobId),
    payments: receipt.payments.map((p) => ({ service: p.service, amount: p.amount, digest: p.digest })),
    skipped: receipt.skipped,
    denied: receipt.denied,
    outputHash: receipt.outputHash,
    reportBlob: receipt.report?.blobId ?? null,
  });
  for (const p of receipt.payments) {
    await rememberAsync(NS.spend, "spend", `${p.service}:${taskId}`, { price: p.amount, digest: p.digest, task: taskId, type: task.type });
  }
  log({ step: "done", totalSpent: receipt.totalSpent });
  await saveReceipt(receipt);
  return receipt;
}

/** User (or scripted) rating. Each paid service gets its own usefulness verdict. */
/**
 * Rate a task. Returns as soon as the new value versions are known; the Walrus writes finish
 * in the background and then fill in each rating's valueBlob. Pass { wait: true } to block
 * until they are stored (the replay does, so its memory links are complete).
 */
export async function rateTask(taskId, ratings, { wait = false } = {}) {
  const r = await loadReceipt(taskId);
  if (!r) throw new Error(`no receipt for ${taskId}`);
  if (r.ratings) return r;
  r.ratings = {};
  const writes = [];
  for (const p of r.payments) {
    const rating = !p.delivered ? "refund" : (ratings[p.service] ?? ratings.default ?? "useful");
    const { version, saved } = rememberRating(p.service, r.task.type, rating);
    r.ratings[p.service] = { rating, valueBlob: null, version: await version };
    writes.push(saved.then((blobId) => [p.service, blobId]));
  }
  await saveReceipt(r);
  const settle = Promise.allSettled(writes).then(async (results) => {
    const latest = await loadReceipt(taskId);
    for (const x of results) if (x.status === "fulfilled") latest.ratings[x.value[0]].valueBlob = x.value[1];
    await saveReceipt(latest);
    return latest;
  });
  return wait ? settle : r;
}

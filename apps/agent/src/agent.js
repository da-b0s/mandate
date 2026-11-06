// The task loop: classify, plan candidates, decide with policy + recalled value,
// buy what passes, answer, and leave a receipt.
import { createHash, randomUUID } from "node:crypto";
import { applyPreferences, decide, rankCandidates } from "@mandate/policy";
import { readGrant, screenAddress } from "@mandate/chain";
import { claimDueSchedules, createSchedule, loadReceipt, recordScheduleRun, saveReceipt } from "@mandate/store";
import { classify, SERVICES, TASK_VALUE } from "./catalog.js";
import { GrantDenied, guardedPurchase } from "./pay.js";
import { NS, recallPreferences, recallValue, rememberAsync, rememberRating } from "./memory.js";
import { writeAnswer } from "./answer.js";
import { archiveReport } from "./archive.js";
import { activeGrantId } from "./mandate.js";
import { currentOwner } from "./context.js";
import { MIN_INTERVAL_MS, sendUsdc } from "./transfer.js";
import { asUser } from "./users.js";

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

  const pendingRecords = [];
  const receipt = { taskId, owner: currentOwner(), ask, task, useMemory, grantId, plan: [], memoriesUsed: [], payments: [], skipped: [], denied: [], outputs: {}, steps };
  if (task.type === "unknown") {
    receipt.answer = "I need a 0x wallet or token address to work on.";
    await saveReceipt(receipt);
    return receipt;
  }
  if (task.type === "transfer") return runTransfer(task, receipt, grantId, log);

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
  // Value memories for every candidate and the user's preferences, recalled in parallel.
  const [values, prefs] = await Promise.all([
    Promise.all(cands.map((c) => (useMemory ? recallValue(c.service, task.type) : { obs: [], blobId: null }))),
    useMemory ? recallPreferences().catch(() => []) : [],
  ]);
  const history = {};
  for (const [i, c] of cands.entries()) {
    history[c.service] = values[i].obs;
    if (values[i].blobId) receipt.memoriesUsed.push({ service: c.service, blobId: values[i].blobId, observations: values[i].obs.length });
  }
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
      if (r.payment) {
        const { retryRecord, ...payment } = r.payment;
        receipt.payments.push({ service: c.service, ...payment, delivered: r.status === 200 });
        if (retryRecord) pendingRecords.push({ service: c.service, digest: payment.digest, retryRecord });
      }
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

  // Memories are read by other tools too (e.g. Claude Code via the Walrus Memory MCP), so they carry
  // the date and human-readable amounts, not just base units.
  const at = new Date().toISOString();
  const usd = (base) => (base / 1e6).toFixed(2);
  receipt.memoryJob = await rememberAsync(NS.receipts, "receipt", taskId, {
    at,
    ask,
    type: task.type,
    plan: receipt.plan,
    memories: receipt.memoriesUsed.map((m) => m.blobId),
    currency: "USDC",
    totalUsdc: usd(receipt.totalSpent),
    payments: receipt.payments.map((p) => ({ service: p.service, usdc: usd(p.amount), amount: p.amount, digest: p.digest })),
    skipped: receipt.skipped,
    denied: receipt.denied,
    answer: receipt.answer?.slice(0, 280),
    outputHash: receipt.outputHash,
    reportBlob: receipt.report?.blobId ?? null,
    grant: grantId,
  });
  for (const p of receipt.payments) {
    await rememberAsync(NS.spend, "spend", `${p.service}:${taskId}`, { at, usdc: usd(p.amount), price: p.amount, digest: p.digest, task: taskId, type: task.type });
  }
  log({ step: "done", totalSpent: receipt.totalSpent });
  await saveReceipt(receipt);
  if (pendingRecords.length) retryRecords(taskId, pendingRecords);
  return receipt;
}

/**
 * The money moved but recording it on the grant failed (usually a network blip). Retry in the
 * background, a minute apart, and fill in the receipt; scripts/record-pending.js covers anything left.
 */
function retryRecords(taskId, pending) {
  (async () => {
    for (const p of pending) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise((r) => setTimeout(r, 60_000));
        try {
          const rec = await p.retryRecord();
          const r = await loadReceipt(taskId);
          const pay = r.payments.find((x) => x.digest === p.digest);
          pay.recordDigest = rec.digest;
          delete pay.recordError;
          await saveReceipt(r);
          break;
        } catch {}
      }
    }
  })();
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
  if ((r.owner ?? null) !== currentOwner()) throw new Error("this task belongs to someone else");
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

const every = (ms) => {
  const units = [["week", 604_800_000], ["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000]];
  const [name, size] = units.find(([, size]) => ms % size === 0) ?? ["minute", 60_000];
  const n = ms / size;
  return n === 1 ? `every ${name}` : `every ${n} ${name}s`;
};

/**
 * Send USDC for the owner, now and optionally on a schedule. Only a signed-in user's own agent may
 * do this: the demo agent's wallet is shared, so moving its money to an address someone types is refused.
 */
async function runTransfer(task, receipt, grantId, log) {
  const owner = currentOwner();
  const usd = (base) => (base / 1e6).toFixed(2);
  const finish = async (answer) => {
    receipt.answer = answer;
    receipt.totalSpent = receipt.payments.reduce((s, p) => s + p.amount, 0);
    log({ step: "done", totalSpent: receipt.totalSpent });
    await saveReceipt(receipt);
    await rememberAsync(NS.receipts, "receipt", receipt.taskId, {
      at: new Date().toISOString(),
      ask: receipt.ask,
      type: "transfer",
      currency: "USDC",
      recipient: task.subject,
      totalUsdc: usd(receipt.totalSpent),
      payments: receipt.payments.map((p) => ({ usdc: usd(p.amount), digest: p.digest })),
      denied: receipt.denied,
      schedule: receipt.schedule ?? null,
      answer,
      grant: grantId,
    }).catch(() => null);
    return receipt;
  };

  if (!owner) return finish("Sending money is only available with your own agent. Sign in, set up your mandate, and ask again.");
  if (task.intervalMs !== null && task.intervalMs < MIN_INTERVAL_MS) return finish("Recurring payments must be at least an hour apart.");

  log({ step: "transfer", recipient: task.subject, amount: task.amount, intervalMs: task.intervalMs });
  const r = await sendUsdc({ grantId, recipient: task.subject, amount: task.amount, log });
  if (r.denied) {
    receipt.denied.push({ service: "transfer", ...r.denied });
    log({ step: "denied", service: "transfer", reason: r.denied.reason, detail: r.denied.detail });
  } else {
    // The transfer and its record_spend are the same transaction, so recordDigest is that digest.
    receipt.payments.push({ service: "transfer", amount: r.amount, payee: r.recipient, digest: r.digest, recordDigest: r.digest, verifiedVia: "tatum-grpc", delivered: true });
  }

  if (task.intervalMs) {
    const nextAt = Date.now() + task.intervalMs;
    const id = await createSchedule({ owner, grantId, recipient: task.subject, amount: task.amount, intervalMs: task.intervalMs, nextAt });
    receipt.schedule = { id, intervalMs: task.intervalMs, nextAt: new Date(nextAt).toISOString() };
    log({ step: "scheduled", id, every: every(task.intervalMs), nextAt: receipt.schedule.nextAt });
  }

  const sent = r.denied
    ? `I did not send ${usd(task.amount)} USDC to ${task.subject.slice(0, 10)}…: ${r.denied.detail} (${r.denied.reason}).`
    : `Sent ${usd(r.amount)} USDC to ${task.subject.slice(0, 10)}…, recorded on your mandate in the same transaction.`;
  const plan = task.intervalMs
    ? ` I will repeat this ${every(task.intervalMs)}, within your mandate's limits, until you cancel it on the Mandate page or the mandate stops (revoked, expired, or no heartbeat).`
    : "";
  return finish(sent + plan);
}

/** Pay every due schedule once, as its owner's agent. Called by the web server about once a minute. */
export async function runDueSchedules() {
  const due = await claimDueSchedules();
  for (const s of due) {
    try {
      await asUser(s.owner, async () => {
        const r = await sendUsdc({ grantId: s.grant_id, recipient: s.recipient, amount: s.amount });
        // Revoked or expired mandates never recover; budget, dormancy and low funds can, so keep trying.
        if (r.denied) await recordScheduleRun(s.id, { error: `${r.denied.reason}: ${r.denied.detail}`, deactivate: ["revoked", "expired"].includes(r.denied.reason) });
        else await recordScheduleRun(s.id, { digest: r.digest });
        await saveReceipt({
          taskId: randomUUID().slice(0, 8),
          owner: s.owner,
          ask: `Scheduled payment #${s.id}: ${(s.amount / 1e6).toFixed(2)} USDC to ${s.recipient}`,
          task: { type: "transfer", subject: s.recipient },
          useMemory: false,
          grantId: s.grant_id,
          plan: ["transfer"],
          memoriesUsed: [],
          payments: r.denied ? [] : [{ service: "transfer", amount: s.amount, payee: s.recipient, digest: r.digest, recordDigest: r.digest, verifiedVia: "tatum-grpc", delivered: true }],
          skipped: [],
          denied: r.denied ? [{ service: "transfer", ...r.denied }] : [],
          outputs: {},
          steps: [{ at: new Date().toISOString(), step: r.denied ? "denied" : "sent", schedule: s.id }],
          answer: r.denied ? `Scheduled payment refused: ${r.denied.detail}` : "Scheduled payment sent.",
          totalSpent: r.denied ? 0 : s.amount,
          schedule: { id: s.id },
        });
      });
    } catch (e) {
      await recordScheduleRun(s.id, { error: String(e.message ?? e).slice(0, 200) });
    }
  }
  return due.length;
}

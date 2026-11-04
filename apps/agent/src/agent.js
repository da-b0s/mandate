// The task loop: classify, plan candidates, decide with policy + recalled value,
// buy what passes, answer, and leave a receipt.
import { createHash, randomUUID } from "node:crypto";
import { decide, rankCandidates } from "@mandate/policy";
import { readGrant } from "@mandate/chain";
import { loadReceipt, saveReceipt } from "@mandate/store";
import { classify, SERVICES, TASK_VALUE } from "./catalog.js";
import { GrantDenied, guardedPurchase } from "./pay.js";
import { NS, recallValue, rememberAsync, rememberRating } from "./memory.js";
import { writeAnswer } from "./answer.js";
import { archiveReport } from "./archive.js";

export { loadReceipt };

export async function runTask({ ask, grantId = process.env.GRANT_ID, useMemory = true, onStep = () => {} }) {
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
  const cands = SERVICES.filter((s) => s.taskTypes.includes(task.type));
  const history = {};
  for (const c of cands) {
    const v = useMemory ? await recallValue(c.service, task.type) : { obs: [], blobId: null };
    history[c.service] = v.obs;
    if (v.blobId) receipt.memoriesUsed.push({ service: c.service, blobId: v.blobId, observations: v.obs.length });
  }
  const ordered = useMemory ? rankCandidates(cands.map((c) => ({ ...c, payee: "" })), (c) => history[c.service], now) : cands;
  receipt.plan = ordered.map((c) => c.service);
  log({ step: "planned", plan: receipt.plan });

  for (const c of ordered) {
    // Value decision first. The payee is only known from the live quote, so grant limits are checked there.
    const d = decide({
      grant,
      candidate: { service: c.service, payee: "*", price: c.price, taskType: task.type },
      history: history[c.service],
      taskValue: TASK_VALUE[task.type],
      nowMs: now,
      useMemory,
    });
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
export async function rateTask(taskId, ratings) {
  const r = await loadReceipt(taskId);
  if (!r) throw new Error(`no receipt for ${taskId}`);
  r.ratings = {};
  for (const p of r.payments) {
    const rating = !p.delivered ? "refund" : (ratings[p.service] ?? ratings.default ?? "useful");
    const saved = await rememberRating(p.service, r.task.type, rating);
    r.ratings[p.service] = { rating, valueBlob: saved.blobId, version: saved.v };
  }
  await saveReceipt(r);
  return r;
}

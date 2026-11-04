// Learning replay (blueprint 9.1): run the fixed task set with memory OFF or ON,
// real mainnet payments, rated by a scripted rater, and write the results.
//
// Usage: MEMORY_VALUE_NS=mandate-value-replay-on GRANT_ID=0x.. node scripts/replay.js on [--seed 7] [--limit 50]
//
// Scripted rater (docs/adr/0001-scripted-rater.md): a paid source is "useful" if it delivered
// and contributed at least one fact not already given by another paid source in the same task;
// otherwise "useless"; undelivered = "refund". Applied identically to both runs.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { listReceipts, rateTask, runTask } from "@mandate/agent";

const mode = process.argv[2];
if (!["on", "off"].includes(mode)) throw new Error("usage: replay.js on|off");
const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : dflt;
};
const seed = arg("seed", mode === "on" ? 7 : 1);
const limit = arg("limit", 50);
if (!process.env.MEMORY_VALUE_NS?.includes("replay")) throw new Error("set MEMORY_VALUE_NS to a replay namespace so the demo memory stays clean");

// Same tasks, different order per run (seeded shuffle).
function shuffle(xs, s) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const tasks = shuffle(JSON.parse(readFileSync("scripts/tasks.json", "utf8")), seed).slice(0, limit);

/** Facts a source contributed: a flag verdict plus holdings/holders it reported. */
function facts(service, out) {
  if (!out || out.error) return new Set();
  if (service === "wallet-risk") return new Set([`flag:${out.screening?.flagged}`, `holdings:${out.holdings?.length ?? "n/a"}`]);
  if (service === "summary") return new Set([`flag:${out.risk === "high"}`]);
  if (service === "holders") return new Set([`profile:${out.profile?.symbol}`, `flagged-holders:${out.flaggedHolders?.length}`]);
  return new Set([JSON.stringify(out)]);
}

function scriptedRatings(receipt) {
  const ratings = {};
  const seen = new Set();
  // Rate in the order sources were paid: the first to give a fact gets the credit.
  for (const p of receipt.payments) {
    if (!p.delivered) {
      ratings[p.service] = "refund";
      continue;
    }
    const f = [...facts(p.service, receipt.outputs[p.service])];
    const novel = f.filter((x) => !seen.has(x.split(":")[0]));
    f.forEach((x) => seen.add(x.split(":")[0]));
    ratings[p.service] = novel.length > 0 ? "useful" : "useless";
  }
  return ratings;
}

// --resume <runId> continues an interrupted run from its next unfinished task.
const ri = process.argv.indexOf("--resume");
const resumeId = ri > 0 ? process.argv[ri + 1] : null;
const runId = resumeId ?? `replay-${mode}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "")}`;
mkdirSync("docs/replay", { recursive: true });
const out = resumeId
  ? JSON.parse(readFileSync(`docs/replay/${runId}.json`, "utf8"))
  : { runId, mode, seed, memoryNamespace: process.env.MEMORY_VALUE_NS, grantId: process.env.GRANT_ID, startedAt: new Date().toISOString(), tasks: [] };
if (resumeId) (out.resumes ??= []).push({ at: new Date().toISOString(), fromTask: out.tasks.length + 1 });
const save = () => writeFileSync(`docs/replay/${runId}.json`, JSON.stringify(out, null, 2));

for (const [i, t] of tasks.entries()) {
  if (i < out.tasks.length) continue;
  // On resume, a task paid just before the crash has an unrated receipt: adopt it instead of paying twice.
  const orphan =
    resumeId && i === out.tasks.length
      ? (await listReceipts()).filter((x) => x.grantId === process.env.GRANT_ID && x.ask === t.ask && !x.ratings && x.startedAt > out.startedAt).at(-1)
      : null;
  if (orphan) console.log(`adopting paid but unrated receipt ${orphan.taskId}`);
  const r = orphan ?? (await runTask({ ask: t.ask, useMemory: mode === "on" }));
  const ratings = scriptedRatings(r);
  if (r.payments.length) await rateTask(r.taskId, ratings, { wait: true });
  const wasted = r.payments.filter((p) => ratings[p.service] !== "useful").reduce((s, p) => s + p.amount, 0);
  const row = {
    i: i + 1,
    id: t.id,
    type: t.type,
    taskId: r.taskId,
    spent: r.totalSpent ?? 0,
    wasted,
    useful: Object.values(ratings).some((x) => x === "useful"),
    paid: r.payments.map((p) => ({ service: p.service, amount: p.amount, digest: p.digest, rating: ratings[p.service] })),
    skipped: r.skipped,
    denied: r.denied,
  };
  out.tasks.push(row);
  save();
  console.log(`${String(i + 1).padStart(2)} ${t.id.padEnd(4)} spent ${(row.spent / 1e6).toFixed(2)} wasted ${(wasted / 1e6).toFixed(2)} ${r.skipped.map((s) => `skip:${s.service}`).join(" ")}${r.denied.map((d) => ` DENIED:${d.reason}`).join("")}`);
}

const sum = (f) => out.tasks.reduce((s, x) => s + f(x), 0);
out.finishedAt = new Date().toISOString();
out.totals = {
  tasks: out.tasks.length,
  spent: sum((x) => x.spent),
  wasted: sum((x) => x.wasted),
  usefulAnswers: sum((x) => (x.useful ? 1 : 0)),
  payments: sum((x) => x.paid.length),
  denied: sum((x) => x.denied.length),
};
out.totals.wastedRate = out.totals.spent ? out.totals.wasted / out.totals.spent : 0;
out.totals.costPerUsefulAnswer = out.totals.usefulAnswers ? out.totals.spent / out.totals.usefulAnswers : null;
save();
console.log(out.totals);

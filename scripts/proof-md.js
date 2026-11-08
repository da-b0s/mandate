// Write docs/PROOF.md from the live record: contract, mandates, the replay, and every payment with
// its Suiscan link. Re-run before submitting: node scripts/proof-md.js
import "dotenv/config";
import { writeFileSync } from "node:fs";
import published from "../packages/move/published.json" with { type: "json" };
import { listReceipts, replayRuns } from "../apps/agent/src/index.js";
import { dormancyDemo } from "../apps/agent/src/proof.js";
import { memoryCounts } from "../apps/agent/src/memory.js";

const tx = (d) => `[\`${d.slice(0, 10)}…\`](https://suiscan.xyz/mainnet/tx/${d})`;
const obj = (id) => `[\`${id.slice(0, 10)}…${id.slice(-4)}\`](https://suiscan.xyz/mainnet/object/${id})`;
const usd = (b) => `${(b / 1e6).toFixed(2)} USDC`;
const NAMES = { "wallet-risk": "Wallet Risk Report", summary: "Premium Summariser", holders: "Token Holder Check", transfer: "Transfer", swap: "Swap" };

const receipts = await listReceipts({ all: true, light: true });
const payments = receipts.flatMap((r) => (r.payments ?? []).map((p) => ({ ...p, taskId: r.taskId, at: r.startedAt ?? r.createdAt, own: Boolean(r.owner) })));
const moved = payments.reduce((s, p) => s + p.amount, 0);
const byKind = {};
for (const p of payments) (byKind[p.service] ??= []).push(p);
const runs = replayRuns();
const off = runs.filter((r) => r.mode === "off").at(-1);
const on = runs.filter((r) => r.mode === "on").at(-1);
const mem = await memoryCounts().catch(() => []);
const memTotal = Array.isArray(mem) ? mem.reduce((s, n) => s + n.memories, 0) : 0;
const dorm = dormancyDemo();
const pct = (a, b) => `${Math.round((a / b - 1) * 100)}%`;

let md = `# Proof

Everything MANDATE claims, with a link you can check. Generated from the live record by
\`node scripts/proof-md.js\` on ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC. The live
version of this page is the [Explorer](https://mandate-gules-five.vercel.app/explorer).

## At a glance

| | |
| --- | --- |
| Payments on Sui mainnet | **${payments.length}** (${usd(moved)} moved) |
| Tasks completed | **${receipts.length}** |
| Memories on Walrus Memory | **${memTotal}** in ${Array.isArray(mem) ? mem.length : 0} namespaces |
| Payments independently re-read through Tatum | **${payments.filter((p) => p.verifiedVia === "tatum-grpc").length} of ${payments.length}** |
${Object.entries(byKind).map(([k, v]) => `| ${NAMES[k] ?? k} | ${v.length} payments, ${usd(v.reduce((s, p) => s + p.amount, 0))} |`).join("\n")}

## The contract

| | |
| --- | --- |
| Package \`mandate::grant\` (first publish) | ${obj(published.originalId ?? published.packageId)}, published in ${tx(published.digest)} |
| Latest version (custody and swaps) | ${obj(published.packageId)}, upgraded in ${tx(published.upgradeDigest)} |
| Custody upgrade (funds held in the mandate) | ${obj(published.custodyId)} |
| Move unit tests | 36, run in CI |

`;

if (off && on) {
  md += `## The learning result

The same 50 tasks (\`scripts/tasks.json\`), run twice on mainnet with real payments: once with memory
off, once with memory on starting empty. Ratings come from a deterministic rater applied to both runs
([ADR 0001](adr/0001-scripted-rater.md)). Raw data: [\`docs/replay/\`](replay/).

| | Memory off | Memory on | Change |
| --- | --- | --- | --- |
| Total spent | ${usd(off.totals.spent)} | ${usd(on.totals.spent)} | ${pct(on.totals.spent, off.totals.spent)} |
| Wasted on useless sources | ${usd(off.totals.wasted)} | ${usd(on.totals.wasted)} | **${pct(on.totals.wasted, off.totals.wasted)}** |
| Wasted share of spend | ${Math.round(off.totals.wastedRate * 100)}% | ${Math.round(on.totals.wastedRate * 100)}% | |
| Cost per useful answer | ${usd(off.totals.costPerUsefulAnswer)} | ${usd(on.totals.costPerUsefulAnswer)} | **${pct(on.totals.costPerUsefulAnswer, off.totals.costPerUsefulAnswer)}** |
| Useful answers | ${off.totals.usefulAnswers} | ${on.totals.usefulAnswers} | |
| Paid calls | ${off.totals.payments} | ${on.totals.payments} | |

`;
}

if (dorm) {
  md += `## Dead man's switch, on mainnet

Mandate ${obj(dorm.grantId)} with a ${dorm.dormancyMs / 60000}-minute check-in window (\`scripts/dormancy-demo.js\`):

| Time (UTC) | Event | Result |
| --- | --- | --- |
${dorm.log.map((e) => `| ${e.at.slice(11, 19)} | ${e.event.replaceAll("-", " ")} | ${[e.tx && tx(e.tx), ...(e.paid ?? []).map((d) => `paid ${tx(d)}`), ...(e.denied ?? []).map((d) => `refused: ${d}`), e.waitSeconds && `no check-in for ${e.waitSeconds}s`].filter(Boolean).join(" ")} |`).join("\n")}

`;
}

md += `## Every payment

Newest first. Each is a real USDC transfer on Sui mainnet. Payments by signed-in users are listed
without their (private) receipt.

| Task | What | Amount | Transaction | Verified |
| --- | --- | --- | --- | --- |
${[...payments].reverse().map((p) => `| ${p.own ? "private" : `[\`${p.taskId}\`](https://mandate-gules-five.vercel.app/receipts/${p.taskId})`} | ${NAMES[p.service] ?? p.service} | ${usd(p.amount)} | ${tx(p.digest)} | ${p.verifiedVia === "tatum-grpc" ? "Tatum gRPC" : "-"} |`).join("\n")}
`;

writeFileSync("docs/PROOF.md", md);
console.log(`docs/PROOF.md: ${payments.length} payments, ${memTotal} memories`);
process.exit(0);

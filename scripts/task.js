// Run one task through the agent.  node scripts/task.js "Is 0x... safe to trade with?" [--no-memory]
import { runTask } from "@mandate/agent";

const ask = process.argv[2];
const r = await runTask({
  ask,
  useMemory: !process.argv.includes("--no-memory"),
  onStep: ({ at, step, ...rest }) => console.log(`  ${step}`, JSON.stringify(rest)),
});
console.log("\nANSWER:\n" + r.answer);
console.log(`\ntask ${r.taskId}  spent ${(r.totalSpent ?? 0) / 1e6} USDC  receipt: data/receipts/${r.taskId}.json`);
for (const p of r.payments) console.log(`  ${p.service}: https://suiscan.xyz/mainnet/tx/${p.digest}`);

// Dead man's switch, end to end on mainnet:
// grant with a 2-minute heartbeat window -> paid task -> owner goes quiet -> GRANT_DENIED: dormant
// -> owner heartbeat -> paid again. Writes docs/dormancy-demo.json for the Proof page.
//   node scripts/dormancy-demo.js
import { writeFileSync } from "node:fs";
import { agentSigner, createGrantTx, execute, GRANT_TYPE, heartbeatTx, readGrant } from "@mandate/chain";
import { runTask } from "@mandate/agent";

const DORMANCY_MS = 2 * 60_000;
const ASK = "Who holds token 0x514910771AF9Ca656af840dff83E8264EcF986CA? Any sanctioned holders?";
const signer = agentSigner(); // owner and agent are the main wallet here; the point is the timer
const log = [];
const note = (event, data = {}) => {
  const e = { at: new Date().toISOString(), event, ...data };
  log.push(e);
  console.log(e.at.slice(11, 19), event, JSON.stringify(data));
};

const created = await execute(
  createGrantTx({ agent: signer.toSuiAddress(), weeklyBudget: 200_000, perCallCap: 100_000, expiresMs: Date.now() + 86_400_000, dormancyMs: DORMANCY_MS }),
  signer,
);
const grantId = Object.entries(created.objectTypes).find(([, t]) => t === GRANT_TYPE)[0];
note("grant-created", { grantId, dormancyMinutes: 2, tx: created.digest });

const task = async (label) => {
  const r = await runTask({ ask: ASK, grantId, useMemory: false });
  note(label, {
    taskId: r.taskId,
    paid: r.payments.map((p) => p.digest),
    denied: r.denied.map((d) => `${d.reason}: ${d.detail}`),
    status: (await readGrant(grantId)).lastHeartbeatMs + DORMANCY_MS > Date.now() ? "active" : "dormant",
  });
};

await task("task-while-active");
note("owner-goes-quiet", { waitSeconds: 150 });
await new Promise((r) => setTimeout(r, 150_000));
await task("task-after-silence");
const hb = await execute(heartbeatTx({ grantId }), signer);
note("owner-heartbeat", { tx: hb.digest });
await task("task-after-heartbeat");

writeFileSync("docs/dormancy-demo.json", JSON.stringify({ grantId, dormancyMs: DORMANCY_MS, log }, null, 2));

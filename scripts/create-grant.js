// Create a mandate on mainnet. Owner = signer of this tx (for now the agent wallet; zkLogin owner comes with the web app).
// Usage: node scripts/create-grant.js [weeklyUsdc=2] [perCallUsdc=0.10] [days=30] [dormancyMinutes=10080]
import { agentSigner, createGrantTx, execute, readGrant, GRANT_TYPE } from "@mandate/chain";

const [weekly = "2", perCall = "0.10", days = "30", dormancyMin = String(7 * 24 * 60)] = process.argv.slice(2);
const usdc = (x) => Math.round(Number(x) * 1e6);
const signer = agentSigner();
const t = await execute(
  createGrantTx({
    agent: signer.toSuiAddress(),
    weeklyBudget: usdc(weekly),
    perCallCap: usdc(perCall),
    expiresMs: Date.now() + Number(days) * 86_400_000,
    dormancyMs: Number(dormancyMin) * 60_000,
  }),
  signer,
);
const grantId = Object.entries(t.objectTypes).find(([, ty]) => ty === GRANT_TYPE)?.[0];
console.log("GRANT_ID=" + grantId);
console.log(await readGrant(grantId));
console.log(`Suiscan: https://suiscan.xyz/mainnet/tx/${t.digest}`);

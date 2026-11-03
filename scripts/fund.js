// Send USDC and SUI from the main wallet (AGENT_SUI_KEY) to another address you own.
// Usage: node scripts/fund.js <address> <usdc> <sui>
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { agentSigner, execute } from "@mandate/chain";
import { USDC } from "@suimpp/mpp";

const [to, usdc, sui] = process.argv.slice(2);
if (!/^0x[0-9a-f]{64}$/.test(to ?? "")) throw new Error("usage: fund.js <0x address> <usdc> <sui>");
const signer = agentSigner();
const tx = new Transaction();
tx.setSender(signer.toSuiAddress());
const parts = [];
if (Number(usdc) > 0) parts.push(coinWithBalance({ type: USDC.type, balance: BigInt(Math.round(Number(usdc) * 1e6)) }));
if (Number(sui) > 0) parts.push(coinWithBalance({ balance: BigInt(Math.round(Number(sui) * 1e9)) }));
tx.transferObjects(parts, to);
const t = await execute(tx, signer);
console.log(`sent ${usdc} USDC + ${sui} SUI to ${to}\nSuiscan: https://suiscan.xyz/mainnet/tx/${t.digest}`);

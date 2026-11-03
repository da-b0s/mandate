// Agent signer and transaction execution (sent via the public fullnode; reads go through Tatum).
import "dotenv/config";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export const fullnode = new SuiGrpcClient({ baseUrl: "https://fullnode.mainnet.sui.io:443", network: "mainnet" });

export function agentSigner() {
  const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_SUI_KEY.trim());
  return Ed25519Keypair.fromSecretKey(secretKey);
}

/** Sign and execute; throws on failure. Returns { digest, effects, objectTypes }. */
export async function execute(tx, signer) {
  const res = await fullnode.signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true, objectTypes: true, events: true } });
  const t = res.Transaction ?? res.FailedTransaction;
  if (!t.effects.status.success) throw new Error(`tx ${t.digest} failed: ${JSON.stringify(t.effects.status.error)}`);
  await fullnode.waitForTransaction({ digest: t.digest });
  return t;
}

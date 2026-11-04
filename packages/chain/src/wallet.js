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

async function retry(fn, attempts = 4) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 1500 * i));
    }
  }
}

/**
 * Sign once, then submit the same signed bytes until the network answers. Resending an
 * identical signed transaction cannot execute twice, so network errors are safe to retry.
 * Throws if the transaction itself fails. Returns { digest, effects, objectTypes }.
 */
export async function execute(tx, signer) {
  tx.setSenderIfNotSet(signer.toSuiAddress());
  const bytes = await retry(() => tx.build({ client: fullnode }));
  const { signature } = await signer.signTransaction(bytes);
  const res = await retry(() =>
    fullnode.executeTransaction({ transaction: bytes, signatures: [signature], include: { effects: true, objectTypes: true, events: true } }),
  );
  const t = res.Transaction ?? res.FailedTransaction;
  if (!t.effects.status.success) throw new Error(`tx ${t.digest} failed: ${JSON.stringify(t.effects.status.error)}`);
  await retry(() => fullnode.waitForTransaction({ digest: t.digest }));
  return t;
}

/** Build a transaction for an external signer (e.g. the owner's browser wallet). Returns base64 bytes. */
export async function buildFor(tx, sender) {
  tx.setSender(sender);
  const bytes = await retry(() => tx.build({ client: fullnode }));
  return Buffer.from(bytes).toString("base64");
}

/** Submit bytes signed elsewhere; same resend-safe path as execute(). */
export async function submitSigned(bytesB64, signature) {
  const transaction = Uint8Array.from(Buffer.from(bytesB64, "base64"));
  const res = await retry(() => fullnode.executeTransaction({ transaction, signatures: [signature], include: { effects: true, events: true, objectTypes: true } }));
  const t = res.Transaction ?? res.FailedTransaction;
  if (!t.effects.status.success) throw new Error(`tx ${t.digest} failed: ${JSON.stringify(t.effects.status.error)}`);
  await retry(() => fullnode.waitForTransaction({ digest: t.digest }));
  return t;
}

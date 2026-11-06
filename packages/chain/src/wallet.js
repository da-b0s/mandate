// Agent signer and transaction execution. Everything goes through Tatum's Sui gRPC gateway:
// building (gas price, dry run), submitting, and confirming, as well as every read.
import "dotenv/config";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import { tatum } from "./tatum.js";

/** The Sui client the app sends transactions with (Tatum). Kept under this name for existing callers. */
export const fullnode = tatum;

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
// One transaction at a time per sending wallet in this process: two concurrent payments from the
// same agent could otherwise pick the same USDC coin, and Sui would reject or lock it. Different
// wallets still run in parallel. (Gas comes from address balances, which need no coin at all.)
const lanes = new Map();
function inLane(address, fn) {
  const prev = lanes.get(address) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  lanes.set(address, run);
  // Clean up without re-raising: the caller handles run's error, and a second, unobserved
  // rejection here would crash the process.
  const cleanup = () => lanes.get(address) === run && lanes.delete(address);
  run.then(cleanup, cleanup);
  return run;
}

export function execute(tx, signer, opts = {}) {
  return inLane(signer.toSuiAddress(), () => executeNow(tx, signer, opts));
}

// Sponsoring yourself is not a sponsorship: Sui wants exactly one signature when sender and gas owner match.
const effectiveSponsor = (sponsor, sender) => (sponsor && sponsor.toSuiAddress() !== sender ? sponsor : null);

async function executeNow(tx, signer, opts = {}) {
  tx.setSenderIfNotSet(signer.toSuiAddress());
  const sponsor = effectiveSponsor(opts.sponsor, signer.toSuiAddress());
  // Sponsored: another key pays gas, so a user's agent only ever needs USDC.
  if (sponsor) tx.setGasOwner(sponsor.toSuiAddress());
  const bytes = await retry(() => tx.build({ client: tatum }));
  const signatures = [(await signer.signTransaction(bytes)).signature];
  if (sponsor) signatures.push((await sponsor.signTransaction(bytes)).signature);
  const res = await retry(() =>
    tatum.executeTransaction({ transaction: bytes, signatures, include: { effects: true, objectTypes: true, events: true } }),
  );
  const t = res.Transaction ?? res.FailedTransaction;
  if (!t.effects.status.success) throw new Error(`tx ${t.digest} failed: ${JSON.stringify(t.effects.status.error)}`);
  await retry(() => tatum.waitForTransaction({ digest: t.digest }));
  return t;
}

/** Build a transaction for an external signer (e.g. the owner's browser wallet). Returns base64 bytes. */
export async function buildFor(tx, sender, opts = {}) {
  tx.setSender(sender);
  const sponsor = effectiveSponsor(opts.sponsor, sender);
  // Sponsored: the server's key pays gas, so a fresh zkLogin address with 0 SUI can still act.
  if (sponsor) tx.setGasOwner(sponsor.toSuiAddress());
  const bytes = await retry(() => tx.build({ client: tatum }));
  return Buffer.from(bytes).toString("base64");
}

/** Submit bytes signed elsewhere; same resend-safe path as execute(). */
export async function submitSigned(bytesB64, signature, opts = {}) {
  const transaction = Uint8Array.from(Buffer.from(bytesB64, "base64"));
  const signatures = [signature];
  // Only co-sign if the bytes really name the sponsor as gas owner (buildFor may have skipped it).
  const { Transaction } = await import("@mysten/sui/transactions");
  const gasOwner = Transaction.from(transaction).getData().gasData.owner;
  if (opts.sponsor && gasOwner === opts.sponsor.toSuiAddress() && gasOwner !== Transaction.from(transaction).getData().sender) {
    signatures.push((await opts.sponsor.signTransaction(transaction)).signature);
  }
  const res = await retry(() => tatum.executeTransaction({ transaction, signatures, include: { effects: true, events: true, objectTypes: true } }));
  const t = res.Transaction ?? res.FailedTransaction;
  if (!t.effects.status.success) throw new Error(`tx ${t.digest} failed: ${JSON.stringify(t.effects.status.error)}`);
  await retry(() => tatum.waitForTransaction({ digest: t.digest }));
  return t;
}

// Sending money for the owner, one-off or on a schedule.
//
// The USDC transfer and the grant's record_spend go in ONE transaction. record_spend aborts if the
// payment breaks any limit (weekly budget, per-call or recipient cap, expiry, revoke, dead man's
// switch), and an abort reverts the whole transaction, so the money cannot move. For transfers the
// grant is enforced by the Move contract itself, not only checked by our server first.
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { checkGrant } from "@mandate/policy";
import { execute, PACKAGE_ID, readGrant, tatum } from "@mandate/chain";
import { USDC } from "@suimpp/mpp";
import { currentSigner, currentSponsor } from "./context.js";

export const MIN_INTERVAL_MS = 3_600_000;

const ABORTS = { 2: "revoked", 3: "expired", 4: "dormant", 5: "over_cap", 6: "budget" };

/** Returns { digest, amount, recipient } or { denied: { reason, detail } }; throws only on unexpected errors. */
export async function sendUsdc({ grantId, recipient, amount, log = () => {} }) {
  const signer = currentSigner();
  const grant = await readGrant(grantId);
  // Our own check first, for a clear message; the contract repeats it inside the transaction.
  const pre = checkGrant(grant, recipient, amount, Date.now());
  if (!pre.ok) return { denied: { reason: pre.reason, detail: pre.detail } };
  log({ step: "grant-ok", spentThisWeek: grant.spentThisWeek, weeklyBudget: grant.weeklyBudget });

  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  tx.transferObjects([coinWithBalance({ type: USDC.type, balance: BigInt(amount) })], recipient);
  tx.moveCall({
    target: `${PACKAGE_ID}::grant::record_spend`,
    arguments: [tx.object(grantId), tx.pure.address(recipient), tx.pure.u64(amount), tx.pure.vector("u8", [...Buffer.from("transfer")]), tx.object.clock()],
  });
  let t;
  try {
    t = await execute(tx, signer, { sponsor: currentSponsor() });
  } catch (e) {
    const msg = String(e.message ?? e);
    const code = msg.match(/MoveAbort[^0-9]*\d+[^0-9]+(\d+)\)?/)?.[1] ?? msg.match(/abort code:?\s*(\d+)/i)?.[1];
    if (code && ABORTS[code]) return { denied: { reason: ABORTS[code], detail: "refused by the Move contract; nothing moved" } };
    if (/insufficient|not enough|InsufficientCoinBalance|balance/i.test(msg)) return { denied: { reason: "funds", detail: "the agent does not hold enough USDC" } };
    throw e;
  }
  log({ step: "sent", digest: t.digest });
  // Independent check through Tatum: the recipient received exactly this amount.
  const v = await tatum.waitForTransaction({ digest: t.digest, include: { balanceChanges: true, effects: true } });
  const vt = v.Transaction ?? v.FailedTransaction;
  const got = vt.balanceChanges.find((b) => b.address === recipient && b.coinType === USDC.type);
  if (!vt.effects.status.success || Number(got?.amount) !== amount) throw new Error(`transfer ${t.digest} failed Tatum verification`);
  log({ step: "verified", digest: t.digest, amount, payee: recipient, verifiedVia: "tatum-grpc" });
  return { digest: t.digest, amount, recipient };
}


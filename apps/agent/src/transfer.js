// Sending money for the owner, one-off or on a schedule.
//
// The money leaves the grant through `pay`, which checks every limit (weekly budget, per-call or
// recipient cap, expiry, revoke, dead man's switch) in the same transaction, so an over-limit
// transfer cannot move anything.
import { checkGrant } from "@mandate/policy";
import { execute, payTx, readGrant, tatum } from "@mandate/chain";
import { USDC } from "@suimpp/mpp";
import { currentSigner, currentSponsor } from "./context.js";
import { fundsFor } from "./custody.js";

export const MIN_INTERVAL_MS = 3_600_000;

const ABORTS = { 2: "revoked", 3: "expired", 4: "dormant", 5: "over_cap", 6: "budget", 11: "funds" };

/** Returns { digest, amount, recipient } or { denied: { reason, detail } }; throws only on unexpected errors. */
export async function sendUsdc({ grantId, recipient, amount, log = () => {} }) {
  const signer = currentSigner();
  const grant = await readGrant(grantId);
  // Our own check first, for a clear message; the contract repeats it inside the transaction.
  const pre = checkGrant(grant, recipient, amount, Date.now());
  if (!pre.ok) return { denied: { reason: pre.reason, detail: pre.detail } };
  log({ step: "grant-ok", spentThisWeek: grant.spentThisWeek, weeklyBudget: grant.weeklyBudget });

  const funds = await fundsFor(grantId);
  if (funds.vault + funds.wallet < amount) return { denied: { reason: "funds", detail: "the mandate does not hold enough USDC" } };
  const tx = payTx({ grantId, payee: recipient, amount, memo: "transfer", sweep: funds.wallet });
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


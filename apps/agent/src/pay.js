// One guarded purchase: grant check on the real 402 quote, pay via MPP on Sui,
// verify through Tatum, then record the spend on the onchain grant.
import { Mppx } from "mppx/client";
import { USDC, sui } from "@suimpp/mpp/client";
import { checkGrant } from "@mandate/policy";
import { agentSigner, execute, fullnode, readGrant, recordSpendTx, tatum } from "@mandate/chain";

export class GrantDenied extends Error {
  constructor(reason, detail) {
    super(`GRANT_DENIED: ${reason} (${detail})`);
    this.reason = reason;
    this.detail = detail;
  }
}

const signer = agentSigner();
const toBase = (decimal) => Math.round(Number(decimal) * 1e6);

/** Returns { status, body, payment }, or throws GrantDenied before any money moves. */
export async function guardedPurchase({ grantId, url, expectedPrice, log }) {
  let quote;
  const mppx = Mppx.create({
    polyfill: false,
    methods: [sui({ client: fullnode, signer, currency: USDC })],
    async onChallenge(challenge, { createCredential }) {
      const r = challenge.request;
      quote = { amount: toBase(r.amount), recipient: r.recipient, currency: r.currency };
      log?.({ step: "quote", ...quote });
      if (!String(r.currency).endsWith("::usdc::USDC")) throw new GrantDenied("over_cap", `unexpected currency ${r.currency}`);
      if (quote.amount !== expectedPrice) throw new GrantDenied("over_cap", `quoted ${quote.amount}, expected ${expectedPrice}`);
      // Fresh onchain state, read through Tatum, right before paying.
      const grant = await readGrant(grantId);
      const d = checkGrant(grant, quote.recipient, quote.amount, Date.now());
      if (!d.ok) throw new GrantDenied(d.reason, d.detail);
      log?.({ step: "grant-ok", spentThisWeek: grant.spentThisWeek, weeklyBudget: grant.weeklyBudget });
      return createCredential();
    },
  });

  const res = await mppx.fetch(url);
  const body = await res.json().catch(() => null);
  const receipt = res.headers.get("payment-receipt");
  if (!receipt) return { status: res.status, body, payment: null };

  const digest = JSON.parse(Buffer.from(receipt, "base64url").toString()).reference;
  log?.({ step: "paid", digest });
  const payment = await verifyPayment(digest, quote);
  log?.({ step: "verified", ...payment });

  const rec = await execute(recordSpendTx({ grantId, payee: quote.recipient, amount: quote.amount, digest }), signer);
  payment.recordDigest = rec.digest;
  log?.({ step: "recorded", digest: rec.digest });
  return { status: res.status, body, payment };
}

/** Independent check via Tatum gRPC: succeeded, sent by the agent, right amount to the right payee. */
export async function verifyPayment(digest, quote) {
  const tx = await tatum.waitForTransaction({ digest, include: { balanceChanges: true, effects: true, transaction: true } });
  const t = tx.Transaction ?? tx.FailedTransaction;
  const received = t.balanceChanges.find((b) => b.address === quote.recipient && b.coinType === quote.currency);
  const ok = t.effects.status.success && t.transaction.sender === signer.toSuiAddress() && Number(received?.amount) === quote.amount;
  if (!ok) throw new Error(`payment ${digest} failed Tatum verification`);
  return { digest, amount: quote.amount, payee: quote.recipient, verifiedVia: "tatum-grpc" };
}

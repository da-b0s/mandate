// Record onchain any verified payment whose record_spend failed.
//   node scripts/record-pending.js                  -> retry receipts flagged recordError
//   node scripts/record-pending.js <grantId> <paymentDigest>  -> record a payment that has no receipt
// The payment is re-verified through Tatum before recording.
import { agentSigner, execute, recordSpendTx, tatum } from "@mandate/chain";
import { listReceipts } from "@mandate/agent";
import { saveReceipt } from "@mandate/store";

const signer = agentSigner();

async function verified(digest) {
  const tx = await tatum.getTransaction({ digest, include: { balanceChanges: true, effects: true, transaction: true } });
  const t = tx.Transaction ?? tx.FailedTransaction;
  if (!t.effects.status.success || t.transaction.sender !== signer.toSuiAddress()) throw new Error(`${digest} is not a successful payment from the agent`);
  const paid = t.balanceChanges.find((b) => b.coinType.endsWith("::usdc::USDC") && b.address !== signer.toSuiAddress() && Number(b.amount) > 0);
  if (!paid) throw new Error(`${digest} moved no USDC`);
  return { payee: paid.address, amount: Number(paid.amount) };
}

async function record(grantId, digest) {
  const { payee, amount } = await verified(digest);
  const rec = await execute(recordSpendTx({ grantId, payee, amount, digest }), signer);
  console.log(`recorded ${amount / 1e6} USDC to ${payee.slice(0, 10)}… for ${digest}: ${rec.digest}`);
  return rec.digest;
}

const [grantId, digest] = process.argv.slice(2);
if (grantId && digest) {
  await record(grantId, digest);
} else {
  for (const r of await listReceipts()) {
    let changed = false;
    for (const p of r.payments.filter((p) => p.recordError && !p.recordDigest)) {
      p.recordDigest = await record(r.grantId, p.digest);
      delete p.recordError;
      changed = true;
    }
    if (changed) await saveReceipt(r);
  }
}

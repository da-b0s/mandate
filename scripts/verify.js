// Re-check MANDATE's public claims against Sui mainnet (via Tatum) and the committed results.
//   pnpm verify
// Read-only: needs TATUM_API_KEY and DATABASE_URL in .env; moves no money.
import { readdirSync, readFileSync } from "node:fs";
import { PACKAGE_ID, readGrant, tatum } from "@mandate/chain";
import { listReceipts } from "@mandate/store";

let failed = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failed++;
};

// 1. The Move package is published on mainnet.
const pkg = await tatum.getObject({ objectId: PACKAGE_ID }).catch(() => null);
check("mandate::grant package exists on mainnet", Boolean(pkg?.object), PACKAGE_ID);

// 2. The configured grants are readable and are mandate::grant::Grant objects.
for (const [label, id] of [["demo grant", process.env.GRANT_ID], ["replay grant", process.env.REPLAY_GRANT_ID]].filter(([, id]) => id)) {
  const g = await readGrant(id).catch((e) => ({ error: e.message }));
  check(`${label} readable`, !g.error, g.error ?? `${g.payments} payments recorded, ${g.totalSpent / 1e6} USDC total`);
}

// 3. Recent receipts: each payment really moved that amount to that payee, and was recorded on the grant.
const receipts = (await listReceipts()).filter((r) => r.payments?.length).slice(-5);
for (const r of receipts) {
  for (const p of r.payments) {
    const t = await tatum.getTransaction({ digest: p.digest, include: { balanceChanges: true, effects: true, events: true } });
    const tx = t.Transaction ?? t.FailedTransaction;
    if (p.service === "swap") {
      // A swap pays the owner in another coin; the contract's Swapped event records what went in.
      const ev = tx.events?.find((e) => e.eventType.endsWith("::grant::Swapped"));
      check(`receipt ${r.taskId} swap`, tx.effects.status.success && Number(ev?.json?.amount_in) === p.amount, `${p.amount / 1e6} USDC in, ${p.received ?? ""}, ${p.digest}`);
      continue;
    }
    const got = tx.balanceChanges.find((b) => b.address === p.payee && b.coinType.endsWith("::usdc::USDC"));
    check(`receipt ${r.taskId} ${p.service} payment`, tx.effects.status.success && Number(got?.amount) === p.amount, `${p.amount / 1e6} USDC, ${p.digest}`);
    if (p.recordDigest) {
      const rec = await tatum.getTransaction({ digest: p.recordDigest, include: { events: true } });
      const ev = (rec.Transaction ?? rec.FailedTransaction).events.find((e) => e.eventType.endsWith("::grant::SpendRecorded"));
      check(`receipt ${r.taskId} ${p.service} recorded on grant`, Boolean(ev), p.recordDigest);
    }
  }
}

// 4. The replay totals in docs/replay match their own per-task rows.
for (const f of readdirSync("docs/replay").filter((f) => f.endsWith(".json") && !f.includes("aborted"))) {
  const run = JSON.parse(readFileSync(`docs/replay/${f}`, "utf8"));
  const spent = run.tasks.reduce((s, t) => s + t.spent, 0);
  const wasted = run.tasks.reduce((s, t) => s + t.wasted, 0);
  check(`${f} totals add up`, spent === run.totals.spent && wasted === run.totals.wasted, `spent ${spent / 1e6}, wasted ${wasted / 1e6}`);
}

console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);

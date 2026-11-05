// Cap proposals (blueprint 7.4): learned value -> suggested per-service caps.
// The agent only proposes. The owner ratifies with set_service_cap from their own wallet;
// the ratification memory is written after the onchain tx and cites its digest.
import { bcs } from "@mysten/sui/bcs";
import { estimateValue, proposeCap } from "@mandate/policy";
import { readGrant, tatum, PACKAGE_ID } from "@mandate/chain";
import { SERVICES } from "./catalog.js";
import { NS, recallValue, rememberWait } from "./memory.js";
import { listReceipts } from "./stats.js";
import { activeGrantId } from "./mandate.js";

/** Payee address per service, as last quoted by the vendor (from receipts). */
async function payees() {
  const out = {};
  for (const r of await listReceipts({ all: true })) for (const p of r.payments) out[p.service] = p.payee;
  return out;
}

export async function capProposals(grantId) {
  grantId ??= await activeGrantId();
  const [grant, payeeOf] = await Promise.all([readGrant(grantId), payees()]);
  const now = Date.now();
  const rows = [];
  for (const s of SERVICES) {
    const payee = payeeOf[s.service];
    if (!payee) continue;
    for (const taskType of s.taskTypes) {
      const mem = await recallValue(s.service, taskType);
      const v = estimateValue(mem.obs, now);
      const currentCap = Math.min(grant.serviceCaps[payee] ?? grant.perCallCap, grant.perCallCap);
      const p = proposeCap(payee, currentCap, grant.perCallCap, s.price, v);
      rows.push({
        service: s.service,
        name: s.name,
        taskType,
        payee,
        price: s.price,
        currentCap,
        observations: v.n,
        pUseful: v.pUseful,
        lcb: v.lcb,
        memoryBlob: mem.blobId,
        proposal: p,
      });
    }
  }
  return { grantId, owner: grant.owner, packageId: PACKAGE_ID, perCallCap: grant.perCallCap, rows };
}

const CapChanged = bcs.struct("CapChanged", { grant: bcs.Address, payee: bcs.Address, cap: bcs.u64() });

/**
 * After the owner's set_service_cap tx lands: verify it onchain via Tatum, then write
 * a policy memory that cites the digest (onchain first, memory second).
 */
export async function recordRatification({ grantId, digest }) {
  const res = await tatum.getTransaction({ digest, include: { events: true, effects: true, transaction: true } });
  const t = res.Transaction ?? res.FailedTransaction;
  if (!t.effects.status.success) throw new Error("transaction failed");
  const ev = t.events.find((e) => e.eventType === `${PACKAGE_ID}::grant::CapChanged`);
  if (!ev) throw new Error("no CapChanged event in this transaction");
  const e = CapChanged.parse(ev.bcs);
  if (e.grant !== grantId) throw new Error("CapChanged event is for a different grant");
  const grant = await readGrant(grantId);
  const body = {
    grant: grantId,
    payee: e.payee,
    cap: Number(e.cap),
    ratifiedBy: t.transaction.sender,
    ratifiedTx: digest,
    caps: grant.serviceCaps,
  };
  if (body.ratifiedBy !== grant.owner) throw new Error("sender is not the grant owner");
  const blobId = await rememberWait(NS.policy, "policy", `grant:${grantId.slice(0, 10)}`, body);
  return { ...body, memoryBlob: blobId };
}

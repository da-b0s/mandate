// mandate::grant: read the onchain Grant via Tatum gRPC and build its transactions.
import { bcs } from "@mysten/sui/bcs";
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { deriveDynamicFieldID } from "@mysten/sui/utils";
import published from "../../move/published.json" with { type: "json" };
import { tatum } from "./tatum.js";

// Calls go to the latest upgrade; types and events keep the id of the first publish.
export const PACKAGE_ID = published.packageId;
export const ORIGINAL_PACKAGE_ID = published.originalId ?? published.packageId;
export const GRANT_TYPE = `${ORIGINAL_PACKAGE_ID}::grant::Grant`;
// VaultKey arrived in the custody upgrade, so its type carries that package id, for good.
const VAULT_KEY_TYPE = `${published.custodyId}::grant::VaultKey`;
export const USDC_TYPE = "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC";

const Address = bcs.Address;
const GrantBcs = bcs.struct("Grant", {
  id: Address,
  version: bcs.u64(),
  owner: Address,
  agent: Address,
  weekly_budget: bcs.u64(),
  per_call_cap: bcs.u64(),
  spent_this_week: bcs.u64(),
  week_start_ms: bcs.u64(),
  expires_ms: bcs.u64(),
  revoked: bcs.bool(),
  last_heartbeat_ms: bcs.u64(),
  dormancy_ms: bcs.u64(),
  service_caps: bcs.struct("VecMap", {
    contents: bcs.vector(bcs.struct("Entry", { key: Address, value: bcs.u64() })),
  }),
  total_spent: bcs.u64(),
  payments: bcs.u64(),
});

/** Read a Grant through Tatum and return it in @mandate/policy's GrantState shape. */
export async function readGrant(grantId) {
  const { object } = await tatum.getObject({ objectId: grantId, include: { content: true } });
  if (object.type !== GRANT_TYPE) throw new Error(`object ${grantId} is ${object.type}, not a Grant`);
  const g = GrantBcs.parse(object.content);
  const n = (x) => Number(x);
  return {
    id: g.id,
    owner: g.owner,
    agent: g.agent,
    weeklyBudget: n(g.weekly_budget),
    perCallCap: n(g.per_call_cap),
    spentThisWeek: n(g.spent_this_week),
    weekStartMs: n(g.week_start_ms),
    expiresMs: n(g.expires_ms),
    revoked: g.revoked,
    lastHeartbeatMs: n(g.last_heartbeat_ms),
    dormancyMs: n(g.dormancy_ms),
    serviceCaps: Object.fromEntries(g.service_caps.contents.map((e) => [e.key, n(e.value)])),
    totalSpent: n(g.total_spent),
    payments: n(g.payments),
  };
}

/** USDC held inside the grant, in base units. A grant that was never funded has no vault yet. */
export async function readVault(grantId) {
  const key = bcs.struct("VaultKey", { dummy_field: bcs.bool() }).serialize({ dummy_field: false }).toBytes();
  const fieldId = deriveDynamicFieldID(grantId, VAULT_KEY_TYPE, key);
  const res = await tatum.getObject({ objectId: fieldId, include: { content: true } }).catch(() => null);
  if (!res?.object?.content) return 0;
  return Number(bcs.struct("Field", { id: Address, name: bcs.bool(), value: bcs.u64() }).parse(res.object.content).value);
}

const fn = (name) => `${PACKAGE_ID}::grant::${name}`;

export function createGrantTx({ agent, weeklyBudget, perCallCap, expiresMs, dormancyMs }) {
  const tx = new Transaction();
  tx.moveCall({
    target: fn("create"),
    arguments: [tx.pure.address(agent), tx.pure.u64(weeklyBudget), tx.pure.u64(perCallCap), tx.pure.u64(expiresMs), tx.pure.u64(dormancyMs), tx.object.clock()],
  });
  return tx;
}

export function recordSpendTx({ grantId, payee, amount, digest }) {
  const tx = new Transaction();
  tx.moveCall({
    target: fn("record_spend"),
    arguments: [tx.object(grantId), tx.pure.address(payee), tx.pure.u64(amount), tx.pure.vector("u8", [...Buffer.from(digest)]), tx.object.clock()],
  });
  return tx;
}

/** Append a deposit of the agent's own wallet USDC into the grant. */
export function addDeposit(tx, { grantId, amount }) {
  tx.moveCall({
    target: fn("deposit"),
    typeArguments: [USDC_TYPE],
    arguments: [tx.object(grantId), coinWithBalance({ type: USDC_TYPE, balance: BigInt(amount) })],
  });
  return tx;
}

/** Pay from the grant; `sweep` first moves that much wallet USDC in, in the same transaction. */
export function payTx({ grantId, payee, amount, memo, sweep = 0 }) {
  const tx = new Transaction();
  if (sweep > 0) addDeposit(tx, { grantId, amount: sweep });
  tx.moveCall({
    target: fn("pay"),
    typeArguments: [USDC_TYPE],
    arguments: [tx.object(grantId), tx.pure.address(payee), tx.pure.u64(amount), tx.pure.vector("u8", [...Buffer.from(memo)]), tx.object.clock()],
  });
  return tx;
}

export function withdrawTx({ grantId, amount }) {
  const tx = new Transaction();
  tx.moveCall({ target: fn("withdraw"), typeArguments: [USDC_TYPE], arguments: [tx.object(grantId), tx.pure.u64(amount)] });
  return tx;
}

export function heartbeatTx({ grantId }) {
  const tx = new Transaction();
  tx.moveCall({ target: fn("heartbeat"), arguments: [tx.object(grantId), tx.object.clock()] });
  return tx;
}

export function setServiceCapTx({ grantId, payee, cap }) {
  const tx = new Transaction();
  tx.moveCall({ target: fn("set_service_cap"), arguments: [tx.object(grantId), tx.pure.address(payee), tx.pure.u64(cap)] });
  return tx;
}

export function revokeTx({ grantId }) {
  const tx = new Transaction();
  tx.moveCall({ target: fn("revoke"), arguments: [tx.object(grantId)] });
  return tx;
}

// Postgres (Neon) storage: receipts for the app, used payment digests for the vendors.
import "dotenv/config";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";

let client;
export function sql() {
  const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  client ??= neon(url);
  return client;
}

export async function saveReceipt(r) {
  await sql()`
    insert into receipts (task_id, data, created_at, owner)
    values (${r.taskId}, ${JSON.stringify(r)}::jsonb, coalesce(${r.steps?.[0]?.at ?? null}::timestamptz, now()), ${r.owner ?? null})
    on conflict (task_id) do update set data = excluded.data`;
}

export async function loadReceipt(taskId) {
  const rows = await sql()`select data from receipts where task_id = ${taskId}`;
  return rows[0]?.data ?? null;
}

/**
 * All receipts, or one user's (owner) or the demo's (owner = null) when `owner` is given.
 * { light: true } drops the bulky steps and vendor outputs (about 90% of the bytes) for
 * pages that only need totals; startedAt then comes from the row's created_at.
 */
export async function listReceipts(owner, { light = false } = {}) {
  const q = sql();
  const rows = light
    ? owner === undefined
      ? await q`select data - 'steps' - 'outputs' as data, created_at from receipts order by created_at asc`
      : owner === null
        ? await q`select data - 'steps' - 'outputs' as data, created_at from receipts where owner is null order by created_at asc`
        : await q`select data - 'steps' - 'outputs' as data, created_at from receipts where owner = ${owner} order by created_at asc`
    : owner === undefined
      ? await q`select data, created_at from receipts order by created_at asc`
      : owner === null
        ? await q`select data, created_at from receipts where owner is null order by created_at asc`
        : await q`select data, created_at from receipts where owner = ${owner} order by created_at asc`;
  return rows.map((r) => ({ ...r.data, startedAt: r.data.steps?.[0]?.at ?? new Date(r.created_at).toISOString() }));
}

/** Latest payout address quoted by each vendor (for cap proposals), without loading receipts. */
export async function latestPayees() {
  const rows = await sql()`
    select distinct on (p->>'service') p->>'service' as service, p->>'payee' as payee
    from receipts, jsonb_array_elements(data->'payments') p
    where p->>'payee' is not null
    order by p->>'service', created_at desc`;
  return Object.fromEntries(rows.map((r) => [r.service, r.payee]));
}

/** Replay protection for MPP: implements @suimpp/mpp's DigestStore. */
export class PgDigestStore {
  async has(digest) {
    const rows = await sql()`select 1 from mpp_digests where digest = ${digest}`;
    return rows.length > 0;
  }
  async set(digest) {
    await sql()`insert into mpp_digests (digest) values (${digest}) on conflict do nothing`;
  }
}

export async function getSetting(key) {
  const rows = await sql()`select value from settings where key = ${key}`;
  return rows[0]?.value ?? null;
}

export async function setSetting(key, value) {
  await sql()`insert into settings (key, value) values (${key}, ${value})
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

/**
 * Take one use of a daily allowance, atomically. Returns true if this caller got one, false if
 * today's `limit` is already used. Counts live in settings, keyed by UTC day.
 */
export async function claimDaily(name, limit) {
  if (limit <= 0) return false;
  const key = `daily:${name}:${new Date().toISOString().slice(0, 10)}`;
  const [row] = await sql()`insert into settings (key, value) values (${key}, '1')
    on conflict (key) do update set value = (settings.value::int + 1)::text, updated_at = now()
    where settings.value::int < ${limit}
    returning value`;
  return Boolean(row);
}

// --- Per-user agent wallets. Keys are encrypted at rest with AGENT_KEY_SECRET (32 bytes, hex). ---

function secretKey() {
  const k = Buffer.from(process.env.AGENT_KEY_SECRET ?? "", "hex");
  if (k.length !== 32) throw new Error("AGENT_KEY_SECRET must be 32 bytes of hex");
  return k;
}

export function encryptSecret(plain) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", secretKey(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(enc) {
  const [iv, tag, body] = enc.split(".").map((p) => Buffer.from(p, "base64"));
  const d = createDecipheriv("aes-256-gcm", secretKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}

export async function getAgentRow(owner) {
  const rows = await sql()`select owner, agent_address, enc_key, grant_id, credit_digest from agents where owner = ${owner}`;
  return rows[0] ?? null;
}

export async function insertAgentRow({ owner, agentAddress, encKey }) {
  const rows = await sql()`insert into agents (owner, agent_address, enc_key) values (${owner}, ${agentAddress}, ${encKey})
    on conflict (owner) do nothing returning owner`;
  return rows.length > 0;
}

export async function setAgentGrant(owner, grantId) {
  await sql()`update agents set grant_id = ${grantId} where owner = ${owner}`;
}

export async function setAgentCredit(owner, digest) {
  await sql()`update agents set credit_digest = ${digest} where owner = ${owner}`;
}

/** Reserve a welcome credit for this owner if one is left. A reserved row reads 'pending' until paid. */
export async function claimCredit(owner, limit) {
  const rows = await sql()`update agents set credit_digest = 'pending'
    where owner = ${owner} and credit_digest is null
      and (select count(*) from agents where credit_digest is not null) < ${limit}
    returning owner`;
  return rows.length > 0;
}

export async function releaseCredit(owner) {
  await sql()`update agents set credit_digest = null where owner = ${owner} and credit_digest = 'pending'`;
}

export async function countCredited() {
  const rows = await sql()`select count(*)::int as n from agents where credit_digest is not null`;
  return rows[0].n;
}

// --- Recurring transfers ---

export async function createSchedule({ owner, grantId, recipient, amount, intervalMs, nextAt }) {
  const rows = await sql()`insert into schedules (owner, grant_id, recipient, amount, interval_ms, next_at)
    values (${owner}, ${grantId}, ${recipient}, ${amount}, ${intervalMs}, ${new Date(nextAt).toISOString()}) returning id`;
  return rows[0].id;
}

export async function listSchedules(owner) {
  return sql()`select id, recipient, amount::float8 as amount, interval_ms::float8 as interval_ms, next_at, active, runs, last_digest, last_error, created_at
    from schedules where owner = ${owner} order by created_at desc`;
}

export async function cancelSchedule(owner, id) {
  const rows = await sql()`update schedules set active = false where id = ${id} and owner = ${owner} returning id`;
  return rows.length > 0;
}

/** Claim due schedules atomically: their next_at moves forward, so two runners never pay the same one twice. */
export async function claimDueSchedules(limit = 10) {
  return sql()`update schedules s set next_at = now() + (s.interval_ms || ' milliseconds')::interval
    where s.id in (select id from schedules where active and next_at <= now() order by next_at limit ${limit} for update skip locked)
    returning s.id, s.owner, s.grant_id, s.recipient, s.amount::float8 as amount, s.interval_ms::float8 as interval_ms`;
}

export async function recordScheduleRun(id, { digest = null, error = null, deactivate = false }) {
  await sql()`update schedules set runs = runs + ${digest ? 1 : 0}, last_digest = coalesce(${digest}, last_digest),
    last_error = ${error}, active = active and not ${deactivate} where id = ${id}`;
}

// Postgres (Neon) storage: receipts for the app, used payment digests for the vendors.
import "dotenv/config";
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
    insert into receipts (task_id, data, created_at)
    values (${r.taskId}, ${JSON.stringify(r)}::jsonb, coalesce(${r.steps?.[0]?.at ?? null}::timestamptz, now()))
    on conflict (task_id) do update set data = excluded.data`;
}

export async function loadReceipt(taskId) {
  const rows = await sql()`select data from receipts where task_id = ${taskId}`;
  return rows[0]?.data ?? null;
}

export async function listReceipts() {
  const rows = await sql()`select data from receipts order by created_at asc`;
  return rows.map((r) => r.data);
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

// Create tables (idempotent). Run: pnpm --filter @mandate/store migrate
import { sql } from "./index.js";

await sql()`create table if not exists receipts (
  task_id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
)`;
await sql()`create index if not exists receipts_created_at on receipts (created_at)`;
await sql()`create table if not exists mpp_digests (
  digest text primary key,
  created_at timestamptz not null default now()
)`;
console.log("tables ready");

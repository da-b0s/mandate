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
await sql()`create table if not exists settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
)`;
await sql()`create table if not exists agents (
  owner text primary key,
  agent_address text not null unique,
  enc_key text not null,
  grant_id text,
  credit_digest text,
  created_at timestamptz not null default now()
)`;
await sql()`alter table receipts add column if not exists owner text`;
await sql()`create index if not exists receipts_owner on receipts (owner, created_at)`;
console.log("tables ready");

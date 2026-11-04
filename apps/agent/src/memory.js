// Walrus Memory: what the agent learned (value), what it paid (spend) and why (receipts).
// Envelopes: [mdt1|<kind>|<key>|v<n>] <json>
import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";

export const NS = {
  value: process.env.MEMORY_VALUE_NS ?? "mandate-value",
  spend: "mandate-spend",
  receipts: "mandate-receipts",
  policy: "mandate-policy",
};

let client;
function memwal() {
  client ??= MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace: NS.value,
  });
  return client;
}

/**
 * The relayer occasionally times out (504). Retry with backoff. Safe for value writes:
 * a duplicate carries the same version and body, and recall takes the highest version.
 */
async function retry(fn, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts) throw e;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

const envelope = (kind, key, v, body) => `[mdt1|${kind}|${key}|v${v}] ${JSON.stringify(body)}`;

export function parseEnvelope(text) {
  const m = text.match(/^\[mdt1\|([^|]+)\|([^|]+)\|v(\d+)\] (.*)$/s);
  if (!m) return null;
  try {
    return { kind: m[1], key: m[2], v: Number(m[3]), body: JSON.parse(m[4]) };
  } catch {
    return null;
  }
}

const MAX_OBS = 50;

/**
 * Each (service, task type) gets its own value namespace. In one shared namespace, a busy
 * service's newer memories pushed a quiet service's latest one out of the recall window,
 * and the agent "forgot" what it had learned.
 */
export const valueNamespace = (service, taskType) => `${NS.value}-${service}-${taskType}`;

/**
 * Latest value memory for (service, task type): its observations and the blob that holds them.
 * We keep only exact-key matches and take the highest version.
 */
export async function recallValue(service, taskType) {
  const key = `${service}:${taskType}`;
  const ns = valueNamespace(service, taskType);
  const res = await retry(() => memwal().recall({ query: `value of ${service} for ${taskType} tasks`, namespace: ns, limit: 5, sort: "recent" }));
  let best = null;
  for (const hit of res.results) {
    const e = parseEnvelope(hit.text);
    if (e?.kind === "value" && e.key === key && (!best || e.v > best.v)) best = { ...e, blobId: hit.blob_id };
  }
  const fromWalrus = { key, v: best?.v ?? 0, obs: (best?.body.obs ?? []).map(([r, at]) => ({ rating: r, atMs: at })), blobId: best?.blobId ?? null };
  // A rating written moments ago may not be indexed yet; prefer the newer of Walrus and this process's last write.
  const local = written.get(key);
  return local && local.v > fromWalrus.v ? { key, v: local.v, obs: local.obs, blobId: local.blobId, pending: !local.blobId } : fromWalrus;
}

/** Last value memory this process wrote, per key: covers Walrus indexing lag. Walrus stays the source on restart. */
const written = new Map();
/** Per-key write queue, so two quick ratings cannot both build on the same version. */
const queues = new Map();

/**
 * Append a rating. Returns at once with the new version; `saved` resolves to the Walrus blob id
 * once the write is stored and indexed (that wait is what made rating feel slow).
 */
export function rememberRating(service, taskType, rating, atMs = Date.now()) {
  const key = `${service}:${taskType}`;
  // Only the read-and-bump step is queued; writes run in parallel (recall takes the highest version).
  const step = (queues.get(key) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const prev = await recallValue(service, taskType);
    const obs = [...prev.obs.map((o) => [o.rating, o.atMs]), [rating, atMs]].slice(-MAX_OBS);
    const entry = { v: prev.v + 1, obs: obs.map(([r, at]) => ({ rating: r, atMs: at })), blobId: null };
    written.set(key, entry);
    return { entry, obs };
  });
  queues.set(key, step);
  const version = step.then(({ entry }) => entry.v);
  const saved = step.then(async ({ entry, obs }) => {
    const useful = obs.filter(([r]) => r === "useful").length;
    const body = { service, taskType, useful, useless: obs.length - useful, obs };
    const res = await retry(() => memwal().rememberAndWait(envelope("value", key, entry.v, body), valueNamespace(service, taskType), { timeoutMs: 90_000 }));
    entry.blobId = res.blob_id;
    return res.blob_id;
  });
  return { version, saved };
}

/** Fire-and-forget episodic memories (spend, receipt); returns the job id. */
export async function rememberAsync(ns, kind, key, body) {
  const accepted = await retry(() => memwal().remember(envelope(kind, key, 1, body), ns));
  return accepted.job_id ?? accepted.id;
}

export async function rememberWait(ns, kind, key, body) {
  const saved = await memwal().rememberAndWait(envelope(kind, key, 1, body), ns, { timeoutMs: 90_000 });
  return saved.blob_id;
}

/** Memory counts per namespace, straight from the relayer (for the Proof page). */
export async function memoryCounts() {
  const out = [];
  let cursor;
  do {
    const page = await memwal().listNamespaces(cursor ? { cursor } : undefined);
    out.push(...page.namespaces.map((n) => ({ name: n.name, memories: n.memory_count, bytes: n.storage_used })));
    cursor = page.has_more ? page.next_cursor : undefined;
  } while (cursor);
  return out;
}

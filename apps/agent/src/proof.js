// Everything a judge needs to check, gathered from chain (via Tatum), Walrus Memory and receipts.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ORIGINAL_PACKAGE_ID, PACKAGE_ID, readGrant, readVault } from "@mandate/chain";
import published from "../../../packages/move/published.json" with { type: "json" };
import { memoryCounts } from "./memory.js";
import { listReceipts } from "./stats.js";
import { activeGrantId } from "./mandate.js";

// Bundlers may drop import.meta.dirname; the web app passes the repo root explicitly.
const ROOT = process.env.MANDATE_ROOT ?? path.resolve(import.meta.dirname, "../../..");

// Replay and dormancy results are files committed with the code: read them once per process.
let runsCache = null;
export function replayRuns() {
  return (runsCache ??= readReplayRuns());
}

function readReplayRuns() {
  const dir = path.join(ROOT, "docs/replay");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith("replay-") && f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")))
    .filter((r) => r.totals)
    .map(({ tasks, ...r }) => ({ ...r, taskCount: tasks.length }));
}

let dormancyCache;
export function dormancyDemo() {
  if (dormancyCache === undefined) {
    const f = path.join(ROOT, "docs/dormancy-demo.json");
    dormancyCache = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  }
  return dormancyCache;
}

export async function proofData() {
  const grantIds = [...new Set([await activeGrantId(), process.env.GRANT_ID, process.env.REPLAY_GRANT_ID].filter(Boolean))];
  const [grants, memories, receipts] = await Promise.all([
    Promise.all(
      grantIds.map((id) =>
        Promise.all([readGrant(id), readVault(id).catch(() => 0)])
          .then(([g, held]) => ({ ...g, held }))
          .catch((e) => ({ id, error: String(e.message) })),
      ),
    ),
    memoryCounts().catch((e) => ({ error: String(e.message) })),
    // The public record: everyone's payments, whoever is looking.
    listReceipts({ light: true, all: true }),
  ]);
  const payments = receipts.flatMap((r) =>
    r.payments.map((p) => ({ taskId: r.taskId, private: Boolean(r.owner), at: r.startedAt, service: p.service, amount: p.amount, digest: p.digest, recordDigest: p.recordDigest, verifiedVia: p.verifiedVia })),
  );
  const valueBlobs = receipts.flatMap((r) => Object.entries(r.ratings ?? {}).map(([service, v]) => ({ taskId: r.taskId, service, ...v })).filter((v) => v.valueBlob));
  return {
    package: { id: PACKAGE_ID, originalId: ORIGINAL_PACKAGE_ID, publishDigest: published.digest, upgradeDigest: published.upgradeDigest ?? null },
    grants,
    // Development scratch namespaces are real but say nothing about the product.
    memories: Array.isArray(memories) ? memories.filter((n) => !/spike|selftest|cachetest/.test(n.name)) : memories,
    payments: payments.reverse(),
    valueBlobs: valueBlobs.reverse(),
    replay: replayRuns(),
    dormancy: dormancyDemo(),
    readVia: "tatum-grpc",
    generatedAt: new Date().toISOString(),
  };
}

// Everything a judge needs to check, gathered from chain (via Tatum), Walrus Memory and receipts.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PACKAGE_ID, readGrant } from "@mandate/chain";
import published from "../../../packages/move/published.json" with { type: "json" };
import { memoryCounts } from "./memory.js";
import { listReceipts } from "./stats.js";

// Bundlers may drop import.meta.dirname; the web app passes the repo root explicitly.
const ROOT = process.env.MANDATE_ROOT ?? path.resolve(import.meta.dirname, "../../..");

export function replayRuns() {
  const dir = path.join(ROOT, "docs/replay");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.startsWith("replay-") && f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(path.join(dir, f), "utf8")))
    .filter((r) => r.totals)
    .map(({ tasks, ...r }) => ({ ...r, taskCount: tasks.length }));
}

export function dormancyDemo() {
  const f = path.join(ROOT, "docs/dormancy-demo.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

export async function proofData() {
  const grantIds = [process.env.GRANT_ID, process.env.REPLAY_GRANT_ID].filter(Boolean);
  const [grants, memories, receipts] = await Promise.all([
    Promise.all(grantIds.map((id) => readGrant(id).catch((e) => ({ id, error: String(e.message) })))),
    memoryCounts().catch((e) => ({ error: String(e.message) })),
    listReceipts(),
  ]);
  const payments = receipts.flatMap((r) =>
    r.payments.map((p) => ({ taskId: r.taskId, at: r.startedAt, service: p.service, amount: p.amount, digest: p.digest, recordDigest: p.recordDigest, verifiedVia: p.verifiedVia })),
  );
  const valueBlobs = receipts.flatMap((r) => Object.entries(r.ratings ?? {}).map(([service, v]) => ({ taskId: r.taskId, service, ...v })).filter((v) => v.valueBlob));
  return {
    package: { id: PACKAGE_ID, publishDigest: published.digest },
    grants,
    memories,
    payments: payments.reverse(),
    valueBlobs: valueBlobs.reverse(),
    replay: replayRuns(),
    dormancy: dormancyDemo(),
    readVia: "tatum-grpc",
    generatedAt: new Date().toISOString(),
  };
}

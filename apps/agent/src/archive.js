// Archive the full task report on Walrus through Tatum's Storage API.
// Returns { blobId, jobId } (the upload finishes asynchronously on Tatum's side), or null on failure.
//
// Each upload costs about 3,000 Tatum credits (a Walrus storage charge), roughly 40 times a whole
// task's other calls, so uploads get a daily allowance: ARCHIVE_PER_DAY, default 20, 0 turns them off.
// Past it, tasks still run and keep their receipts; they just are not archived.
import { claimDaily } from "@mandate/store";

const PER_DAY = Number(process.env.ARCHIVE_PER_DAY ?? 20);

export async function archiveReport(report) {
  if (!process.env.TATUM_API_KEY) return null;
  try {
    if (!(await claimDaily("archive", PER_DAY))) return null;
    const form = new FormData();
    form.append("file", new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }), `mandate-report-${report.taskId}.json`);
    const res = await fetch("https://api.tatum.io/v4/data/storage/upload", {
      method: "POST",
      headers: { "x-api-key": process.env.TATUM_API_KEY },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.blobId ? { blobId: j.blobId, jobId: j.jobId, via: "tatum-storage" } : null;
  } catch {
    return null;
  }
}

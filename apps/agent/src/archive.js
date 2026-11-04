// Archive the full task report on Walrus through Tatum's Storage API.
// Returns { blobId, jobId } (the upload finishes asynchronously on Tatum's side), or null on failure.
export async function archiveReport(report) {
  if (!process.env.TATUM_API_KEY) return null;
  try {
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

import { agent, chain } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 120;

// Submits the owner-signed transaction, then (for a cap change) writes the policy memory
// that cites the onchain digest: onchain first, memory second.
export async function POST(req: Request) {
  const { bytes, signature, action } = await req.json();
  if (typeof bytes !== "string" || typeof signature !== "string") return Response.json({ error: "bad request" }, { status: 400 });
  try {
    const t = await (await chain()).submitSigned(bytes, signature);
    const out: Record<string, unknown> = { digest: t.digest };
    if (action === "cap") out.ratification = await (await agent()).recordRatification({ grantId: process.env.GRANT_ID!, digest: t.digest });
    return Response.json(out);
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e).slice(0, 300) }, { status: 400 });
  }
}

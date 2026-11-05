import { agent, chain } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 120;

// Submits the owner-signed transaction. A cap change then gets a policy memory citing the digest
// (onchain first, memory second); a new grant becomes the one the agent spends under.
export async function POST(req: Request) {
  const { bytes, signature, action } = await req.json();
  if (typeof bytes !== "string" || typeof signature !== "string") return Response.json({ error: "bad request" }, { status: 400 });
  try {
    const [a, c] = await Promise.all([agent(), chain()]);
    const t = await c.submitSigned(bytes, signature, { sponsor: c.agentSigner() });
    const out: Record<string, unknown> = { digest: t.digest };
    if (action === "cap") out.ratification = await a.recordRatification({ grantId: await a.activeGrantId(), digest: t.digest });
    if (action === "create") {
      const grantId = Object.entries(t.objectTypes ?? {}).find(([, ty]) => String(ty).endsWith("::grant::Grant"))?.[0];
      if (!grantId) throw new Error("no Grant created in this transaction");
      await a.adoptGrant(grantId);
      out.grantId = grantId;
    }
    return Response.json(out);
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e).slice(0, 300) }, { status: 400 });
  }
}

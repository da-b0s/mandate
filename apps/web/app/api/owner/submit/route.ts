import { agent, chain } from "@/lib/agent";
import { asSessionAgent, sessionOwner } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

// Submits the owner-signed transaction. A cap change then gets a policy memory citing the digest
// (onchain first, memory second); a new grant becomes the one the agent spends under.
export async function POST(req: Request) {
  const body = await req.json();
  const owner = await sessionOwner();
  return asSessionAgent(() => submit(body, owner), { setup: true });
}

async function submit({ bytes, signature, action }: any, owner: string | null) {
  if (typeof bytes !== "string" || typeof signature !== "string") return Response.json({ error: "bad request" }, { status: 400 });
  try {
    const [a, c] = await Promise.all([agent(), chain()]);
    const t = await c.submitSigned(bytes, signature, { sponsor: c.agentSigner() });
    const out: Record<string, unknown> = { digest: t.digest };
    if (action === "cap") out.ratification = await a.recordRatification({ grantId: await a.activeGrantId(), digest: t.digest });
    if (action === "create") {
      const grantId = Object.entries(t.objectTypes ?? {}).find(([, ty]) => String(ty).endsWith("::grant::Grant"))?.[0];
      if (!grantId) throw new Error("no Grant created in this transaction");
      // A signed-in user's new grant becomes theirs; the demo owner adopts it for the demo agent.
      const me = owner ? await a.getUserAgent(owner) : null;
      if (owner && me) {
        await a.setUserGrant(owner, grantId);
        // First mandate of a new agent: pay the welcome credit into it (skipped quietly if none left).
        if (!me.credited) out.credit = await a.grantWelcomeCredit(owner, grantId);
      } else await a.adoptGrant(grantId);
      out.grantId = grantId;
    }
    return Response.json(out);
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e).slice(0, 300) }, { status: 400 });
  }
}

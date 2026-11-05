import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { agent, chain } from "@/lib/agent";
import { asSessionAgent } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const a = await agent();
  return Response.json({ prefs: await asSessionAgent(() => a.recallPreferences()) });
}

// Owner-facing: free text in, facts out (Walrus Memory analyze()). Preferences can only tighten spending.
export async function POST(req: Request) {
  const body = await req.json();
  return asSessionAgent(() => save(body));
}

async function save({ text, signature }: { text: unknown; signature: unknown }) {
  if (typeof text !== "string" || text.trim().length < 5 || text.length > 300) {
    return Response.json({ error: "Write a preference of 5-300 characters." }, { status: 400 });
  }
  // Only the owner may teach the agent preferences: they sign the exact text with their wallet (no gas).
  const a = await agent();
  try {
    // zkLogin (Google) signatures are checked against onchain state, so pass a client.
    const signer = await verifyPersonalMessageSignature(new TextEncoder().encode(prefMessage(text)), signature as string, { client: (await chain()).fullnode });
    if (signer.toSuiAddress() !== (await a.appOwner())) throw new Error("not the owner");
  } catch {
    return Response.json({ error: "Sign with the wallet that owns this mandate." }, { status: 403 });
  }
  return Response.json({ facts: await a.savePreference(text.trim()) });
}

function prefMessage(text: string) {
  return `MANDATE preference:
${text}`;
}

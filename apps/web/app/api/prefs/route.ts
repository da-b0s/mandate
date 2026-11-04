import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { agent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return Response.json({ prefs: await (await agent()).recallPreferences() });
}

// Owner-facing: free text in, facts out (Walrus Memory analyze()). Preferences can only tighten spending.
export async function POST(req: Request) {
  const { text, signature } = await req.json();
  if (typeof text !== "string" || text.trim().length < 5 || text.length > 300) {
    return Response.json({ error: "Write a preference of 5-300 characters." }, { status: 400 });
  }
  // Only the owner may teach the agent preferences: they sign the exact text with their wallet (no gas).
  const a = await agent();
  try {
    const signer = await verifyPersonalMessageSignature(new TextEncoder().encode(prefMessage(text)), signature);
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

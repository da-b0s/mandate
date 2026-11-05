import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { chain } from "@/lib/agent";
import { loginMessage, setSession } from "@/lib/session";

export const runtime = "nodejs";

// Proves the caller controls `address` (Slush or Google/zkLogin), then starts a session.
export async function POST(req: Request) {
  const { address, issuedAt, signature } = await req.json();
  if (!/^0x[0-9a-f]{64}$/.test(address) || typeof issuedAt !== "string" || typeof signature !== "string") {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const age = Date.now() - Date.parse(issuedAt);
  if (!(age >= -60_000 && age < 5 * 60_000)) return Response.json({ error: "sign-in message expired; try again" }, { status: 400 });
  try {
    const signer = await verifyPersonalMessageSignature(new TextEncoder().encode(loginMessage(address, issuedAt)), signature, {
      client: (await chain()).fullnode,
    });
    if (signer.toSuiAddress() !== address) throw new Error("mismatch");
  } catch {
    return Response.json({ error: "signature did not verify" }, { status: 401 });
  }
  await setSession(address);
  return Response.json({ ok: true });
}

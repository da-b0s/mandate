import { chain } from "@/lib/agent";
import { sessionOwner } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// What the signed-in owner's own address holds (not the mandate), read through Tatum.
export async function GET() {
  const owner = await sessionOwner();
  if (!owner) return Response.json({ error: "Sign in first." }, { status: 401 });
  const c = await chain();
  return Response.json({ address: owner, balances: await c.ownerBalances(owner) });
}

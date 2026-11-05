import { agent } from "@/lib/agent";
import { sessionOwner } from "@/lib/session";

export const runtime = "nodejs";

// Create the signed-in user's own agent wallet (idempotent). Its key never leaves the server.
export async function POST() {
  const owner = await sessionOwner();
  if (!owner) return Response.json({ error: "sign in first" }, { status: 401 });
  const me = await (await agent()).createUserAgent(owner);
  return Response.json({ agent: { address: me.agentAddress, grantId: me.grantId } });
}

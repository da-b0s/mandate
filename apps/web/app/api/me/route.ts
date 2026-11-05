import { agent } from "@/lib/agent";
import { sessionOwner } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Who is signed in, and how far their own agent is set up: none -> agent -> mandate -> funded.
export async function GET() {
  const owner = await sessionOwner();
  if (!owner) return Response.json({ owner: null });
  const a = await agent();
  const me = await a.getUserAgent(owner);
  if (!me) return Response.json({ owner, agent: null });
  const { tatum } = await import("@mandate/chain");
  const { balances } = await tatum.listBalances({ owner: me.agentAddress });
  const usdc = Number(balances.find((b: any) => b.coinType.endsWith("::usdc::USDC"))?.balance ?? 0);
  return Response.json({ owner, agent: { address: me.agentAddress, grantId: me.grantId, usdc, credited: me.credited } });
}

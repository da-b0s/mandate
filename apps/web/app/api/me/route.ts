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
  // Funds sent to the agent's address move into the grant at its next payment, so both count.
  const usdc = await usdcBalance(me.agentAddress, me.grantId);
  return Response.json({ owner, agent: { address: me.agentAddress, grantId: me.grantId, usdc, credited: me.credited } });
}

// Every page asks for /api/me; a 15-second-old balance is fine and saves Tatum credits.
const balances = new Map<string, { at: number; value: number }>();
async function usdcBalance(address: string, grantId: string | null) {
  const hit = balances.get(address);
  if (hit && Date.now() - hit.at < 15_000) return hit.value;
  const { tatum, readVault } = await import("@mandate/chain");
  const { balances: list } = await tatum.listBalances({ owner: address });
  const wallet = Number(list.find((b: any) => b.coinType.endsWith("::usdc::USDC"))?.balance ?? 0);
  const value = wallet + (grantId ? await readVault(grantId) : 0);
  balances.set(address, { at: Date.now(), value });
  return value;
}

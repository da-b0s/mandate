import { agent, chain } from "@/lib/agent";
import { asSessionAgent } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live state of the grant the agent spends under, read from Sui mainnet through Tatum gRPC.
export async function GET() {
  return asSessionAgent(read);
}

async function read() {
  const a = await agent();
  const c = await chain();
  const g = await c.readGrant(await a.activeGrantId());
  // USDC sent to the agent moves into the grant at its next payment, so both count as held.
  const [vault, { balances }] = await Promise.all([c.readVault(g.id).catch(() => 0), c.tatum.listBalances({ owner: g.agent })]);
  const held = vault + Number(balances.find((b: any) => b.coinType === c.USDC_TYPE)?.balance ?? 0);
  const now = Date.now();
  const status = g.revoked ? "revoked" : now >= g.expiresMs ? "expired" : now >= g.lastHeartbeatMs + g.dormancyMs ? "dormant" : "active";
  return Response.json({ ...g, held, status, readVia: "tatum-grpc", appOwner: await a.appOwner(), agentAddress: a.agentAddress() });
}

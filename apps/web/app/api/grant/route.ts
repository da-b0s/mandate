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
  const g = await (await chain()).readGrant(await a.activeGrantId());
  const now = Date.now();
  const status = g.revoked ? "revoked" : now >= g.expiresMs ? "expired" : now >= g.lastHeartbeatMs + g.dormancyMs ? "dormant" : "active";
  return Response.json({ ...g, status, readVia: "tatum-grpc", appOwner: await a.appOwner(), agentAddress: a.agentAddress() });
}

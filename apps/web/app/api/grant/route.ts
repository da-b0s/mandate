import { chain } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live grant state, read from Sui mainnet through Tatum gRPC.
export async function GET() {
  const { readGrant } = await chain();
  const g = await readGrant(process.env.GRANT_ID);
  const now = Date.now();
  const status = g.revoked ? "revoked" : now >= g.expiresMs ? "expired" : now >= g.lastHeartbeatMs + g.dormancyMs ? "dormant" : "active";
  return Response.json({ ...g, status, readVia: "tatum-grpc" });
}

import { agent } from "@/lib/agent";
import { asSessionAgent } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const a = await agent();
  return Response.json(await asSessionAgent(() => a.capProposals()));
}

import { agent } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await (await agent()).valueStats());
}

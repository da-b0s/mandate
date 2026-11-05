import { agent } from "@/lib/agent";
import { sessionOwner } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const r = await (await agent()).loadReceipt(id);
  // Demo receipts are public; a user's receipts are visible to that user only.
  if (!r || (r.owner && r.owner !== (await sessionOwner()))) return Response.json({ error: "not found" }, { status: 404 });
  return Response.json(r);
}

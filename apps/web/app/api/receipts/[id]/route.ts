import { agent } from "@/lib/agent";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}$/.test(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const r = await (await agent()).loadReceipt(id);
  return r ? Response.json(r) : Response.json({ error: "not found" }, { status: 404 });
}

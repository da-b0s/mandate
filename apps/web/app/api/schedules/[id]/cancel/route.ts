import { sessionOwner } from "@/lib/session";

export const runtime = "nodejs";

// Stop a recurring transfer. Only its owner can, and stopping is always safe, so no signature is needed.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await sessionOwner();
  if (!owner) return Response.json({ error: "sign in first" }, { status: 401 });
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return Response.json({ error: "bad id" }, { status: 400 });
  const { cancelSchedule } = await import("@mandate/store");
  return (await cancelSchedule(owner, id)) ? Response.json({ ok: true }) : Response.json({ error: "not found" }, { status: 404 });
}

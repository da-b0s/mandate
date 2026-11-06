import { sessionOwner } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The signed-in user's recurring transfers.
export async function GET() {
  const owner = await sessionOwner();
  if (!owner) return Response.json({ schedules: [] });
  const { listSchedules } = await import("@mandate/store");
  return Response.json({ schedules: await listSchedules(owner) });
}

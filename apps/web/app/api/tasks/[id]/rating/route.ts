import { agent } from "@/lib/agent";
import { asSessionAgent } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const RATINGS = new Set(["useful", "useless", "refund"]);

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ratings } = await req.json();
  if (!ratings || typeof ratings !== "object" || !Object.values(ratings).every((r) => RATINGS.has(r as string))) {
    return Response.json({ error: "ratings must map service -> useful|useless|refund" }, { status: 400 });
  }
  const { rateTask } = await agent();
  try {
    const r = await asSessionAgent(() => rateTask(id, ratings));
    return Response.json({ ratings: r.ratings });
  } catch (e) {
    return Response.json({ error: String((e as Error).message) }, { status: 404 });
  }
}

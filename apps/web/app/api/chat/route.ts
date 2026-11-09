import { agent } from "@/lib/agent";
import { asSessionAgent, sessionOwner } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEEP = 40;

// The signed-in user's recent tasks, oldest first, shaped for the chat: each receipt is one exchange.
export async function GET() {
  const owner = await sessionOwner();
  if (!owner) return Response.json({ messages: [] });
  const a = await agent();
  const receipts = await asSessionAgent(() => a.listReceipts());
  const mine = receipts.filter((r: any) => r.owner === owner).slice(-KEEP);
  return Response.json({
    messages: mine.map((r: any) => ({
      at: r.startedAt,
      ask: r.ask,
      useMemory: r.useMemory !== false,
      steps: (r.steps ?? []).filter((s: any) => s.step !== "done"),
      receipt: {
        taskId: r.taskId,
        answer: r.answer,
        answerModel: r.answerModel,
        totalSpent: r.totalSpent ?? (r.payments ?? []).reduce((n: number, p: any) => n + p.amount, 0),
        payments: r.payments ?? [],
        skipped: r.skipped ?? [],
        denied: r.denied ?? [],
        memoriesUsed: r.memoriesUsed ?? [],
        outputs: r.outputs?.["tatum-free"] ? { "tatum-free": true } : {},
      },
      ratings: r.ratings ?? undefined,
    })),
  });
}

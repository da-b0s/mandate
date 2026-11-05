import { agent } from "@/lib/agent";
import { allowTask } from "@/lib/limit";
import { runAs, sessionOwner } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

// Streams NDJSON: one line per agent step, then {"receipt": ...}.
export async function POST(req: Request) {
  const { ask, useMemory = true } = await req.json();
  if (typeof ask !== "string" || ask.length === 0 || ask.length > 500) {
    return Response.json({ error: "ask must be 1-500 characters" }, { status: 400 });
  }
  const gate = allowTask(req);
  if (!gate.ok) return Response.json({ error: gate.error }, { status: 429 });
  const owner = await sessionOwner();
  const { runTask } = await agent();
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (o: unknown) => controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
      try {
        const receipt = await runAs(owner, () => runTask({ ask, useMemory: Boolean(useMemory), onStep: (s: unknown) => send({ step: s }) }));
        const { steps, ...rest } = receipt;
        send({ receipt: rest });
      } catch (e) {
        send({ error: String((e as Error).message ?? e) });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}

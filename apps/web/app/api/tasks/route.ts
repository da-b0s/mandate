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
  const a = await agent();
  const { runTask } = a;
  // Signed in but not set up yet: say so, rather than quietly running the demo agent for them.
  if (!owner) return Response.json({ error: "Sign in to chat with your own agent. It takes about two minutes." }, { status: 401 });
  {
    const me = await a.getUserAgent(owner);
    if (!me) return Response.json({ error: "You're signed in. Create your agent first (step 1 on this page)." }, { status: 409 });
    if (!me.grantId) return Response.json({ error: "Your agent needs a mandate first: sign one on the Mandate page (step 2)." }, { status: 409 });
  }
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

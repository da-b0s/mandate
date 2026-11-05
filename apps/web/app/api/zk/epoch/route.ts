import { chain } from "@/lib/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The browser bakes maxEpoch into the Google login nonce; the session lasts until then.
export async function GET() {
  return Response.json({ epoch: await (await chain()).currentEpoch() });
}

import { chain } from "@/lib/agent";

export const runtime = "nodejs";
export const maxDuration = 60;

// Google id_token + the browser's ephemeral public key -> zkLogin address and proof (via Shinami).
export async function POST(req: Request) {
  const { jwt, maxEpoch, extendedEphemeralPublicKey, randomness } = await req.json();
  if (![jwt, extendedEphemeralPublicKey, randomness].every((x) => typeof x === "string") || !Number.isInteger(maxEpoch)) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  try {
    return Response.json(await (await chain()).zkLogin({ jwt, maxEpoch, extendedEphemeralPublicKey, randomness }));
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e).slice(0, 300) }, { status: 400 });
  }
}

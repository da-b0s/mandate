import { clientIp } from "@/lib/limit";

export const dynamic = "force-dynamic";

// Keep-alive / uptime check: no Tatum, Walrus or database calls, so it costs nothing and
// only reports down when the app itself is down. `?ip` echoes the caller's own address as the
// rate limiter sees it (useful behind the Vercel front door; it only ever shows you yourself).
export function GET(req: Request) {
  const body: Record<string, unknown> = { ok: true, at: new Date().toISOString() };
  if (new URL(req.url).searchParams.has("ip")) body.ip = clientIp(req);
  return Response.json(body);
}

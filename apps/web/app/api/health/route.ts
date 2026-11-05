export const dynamic = "force-dynamic";

// Keep-alive / uptime check: no Tatum, Walrus or database calls, so it costs nothing and
// only reports down when the app itself is down.
export function GET() {
  return Response.json({ ok: true, at: new Date().toISOString() });
}

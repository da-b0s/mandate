// Abuse guard. Tasks now spend from each user's own mandate (whose limits the contract enforces), so this
// only stops one connection flooding the server and our Tatum and Walrus quotas.
const PER_IP = Number(process.env.TASKS_PER_IP ?? 20);
const WINDOW_MS = 10 * 60 * 1000;
const PER_DAY = Number(process.env.TASKS_PER_DAY ?? 300);

const hits = new Map<string, number[]>();
let day = { start: Date.now(), count: 0 };

export function allowTask(req: Request): { ok: true } | { ok: false; error: string } {
  const now = Date.now();
  if (now - day.start > 86_400_000) day = { start: now, count: 0 };
  if (day.count >= PER_DAY) return { ok: false, error: "The demo's daily task limit is used up. Try again tomorrow." };
  const ip = clientIp(req);
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP) return { ok: false, error: `Limit of ${PER_IP} tasks per 10 minutes reached. Try again shortly.` };
  recent.push(now);
  hits.set(ip, recent);
  day.count += 1;
  return { ok: true };
}

/**
 * The visitor's address. The first x-forwarded-for entry is whatever the client sent, so it can be
 * faked. Render appends its own two hops (Cloudflare, internal), so the entry before them is the real
 * peer; behind the Vercel front door that peer is Vercel, which passes the visitor in
 * x-vercel-forwarded-for. Forging that header means bypassing Vercel, and the app-wide daily cap
 * and each grant's onchain budget still bound what that could cost.
 */
export function clientIp(req: Request) {
  const viaVercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim();
  if (viaVercel) return viaVercel;
  const chain = (req.headers.get("x-forwarded-for") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return chain.at(-3) ?? chain.at(-1) ?? "local";
}

// Public demo guard: the onchain grant caps weekly spend; this stops one visitor using it all.
const PER_IP = Number(process.env.TASKS_PER_IP ?? 5);
const WINDOW_MS = 10 * 60 * 1000;
const PER_DAY = Number(process.env.TASKS_PER_DAY ?? 60);

const hits = new Map<string, number[]>();
let day = { start: Date.now(), count: 0 };

export function allowTask(req: Request): { ok: true } | { ok: false; error: string } {
  const now = Date.now();
  if (now - day.start > 86_400_000) day = { start: now, count: 0 };
  if (day.count >= PER_DAY) return { ok: false, error: "The demo's daily task limit is used up. Try again tomorrow." };
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= PER_IP) return { ok: false, error: `Limit of ${PER_IP} tasks per 10 minutes reached. Try again shortly.` };
  recent.push(now);
  hits.set(ip, recent);
  day.count += 1;
  return { ok: true };
}

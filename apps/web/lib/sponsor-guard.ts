// We pay gas for owner actions and for users' agents. Cap it so one person cannot drain the
// sponsor: per-owner daily limits, an app-wide daily ceiling, and a minimum sponsor balance.
import "server-only";
import { chain } from "./agent";

const DAY = 86_400_000;
const LIMITS = { create: 3, action: 30 } as const;
const APP_DAILY = Number(process.env.SPONSOR_DAILY_MAX ?? 300);
const MIN_SUI = 50_000_000n; // 0.05 SUI

const used = new Map<string, number[]>();
let appDay = { start: Date.now(), n: 0 };
let balanceCheck = { at: 0, ok: true };

export async function allowSponsored(owner: string, kind: "create" | "action"): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = Date.now();
  if (now - appDay.start > DAY) appDay = { start: now, n: 0 };
  if (appDay.n >= APP_DAILY) return { ok: false, error: "The app's free-gas allowance for today is used up. Please try again tomorrow." };

  const key = `${owner}:${kind}`;
  const recent = (used.get(key) ?? []).filter((t) => now - t < DAY);
  if (recent.length >= LIMITS[kind]) {
    return { ok: false, error: kind === "create" ? "You can create up to 3 mandates a day." : "You have reached today's limit of 30 free-gas actions." };
  }

  if (now - balanceCheck.at > 60_000) {
    const c = await chain();
    const b = (await c.tatum.getBalance({ owner: c.agentSigner().toSuiAddress() })).balance;
    balanceCheck = { at: now, ok: BigInt(b.balance) >= MIN_SUI };
  }
  if (!balanceCheck.ok) return { ok: false, error: "The gas sponsor is low on SUI; the operator has been asked to top it up." };

  recent.push(now);
  used.set(key, recent);
  appDay.n += 1;
  return { ok: true };
}

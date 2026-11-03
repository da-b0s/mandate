// Hard limits. Mirrors the onchain mandate::grant object; the agent runs this
// before every payment and refuses on any failure. Amounts are USDC base units (6 dp).

export interface GrantState {
  weeklyBudget: number;
  perCallCap: number;
  spentThisWeek: number;
  weekStartMs: number;
  expiresMs: number;
  revoked: boolean;
  lastHeartbeatMs: number;
  dormancyMs: number;
  /** payee address -> cap; 0 = blocked. Payees not listed fall back to perCallCap. */
  serviceCaps: Record<string, number>;
}

export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type DenyReason = "revoked" | "expired" | "dormant" | "over_cap" | "budget";

export type GrantDecision =
  | { ok: true; spentThisWeek: number }
  | { ok: false; reason: DenyReason; detail: string };

export function inactiveReason(g: GrantState, nowMs: number): DenyReason | null {
  if (g.revoked) return "revoked";
  if (nowMs >= g.expiresMs) return "expired";
  if (nowMs >= g.lastHeartbeatMs + g.dormancyMs) return "dormant";
  return null;
}

/** Spend counted against this week, resetting when the week window has rolled over. */
export function effectiveSpent(g: GrantState, nowMs: number): number {
  return nowMs >= g.weekStartMs + WEEK_MS ? 0 : g.spentThisWeek;
}

export function checkGrant(g: GrantState, payee: string, price: number, nowMs: number): GrantDecision {
  if (!Number.isInteger(price) || price <= 0) {
    return { ok: false, reason: "over_cap", detail: `invalid price ${price}` };
  }
  const inactive = inactiveReason(g, nowMs);
  if (inactive) return { ok: false, reason: inactive, detail: `grant is ${inactive}` };

  const serviceCap = g.serviceCaps[payee] ?? g.perCallCap;
  const cap = Math.min(g.perCallCap, serviceCap);
  if (price > cap) {
    return { ok: false, reason: "over_cap", detail: `price ${price} > cap ${cap}` };
  }

  const spent = effectiveSpent(g, nowMs);
  if (spent + price > g.weeklyBudget) {
    return { ok: false, reason: "budget", detail: `spent ${spent} + ${price} > weekly ${g.weeklyBudget}` };
  }
  return { ok: true, spentThisWeek: spent + price };
}

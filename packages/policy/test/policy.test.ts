import { describe, expect, it } from "vitest";
import {
  betaCdf,
  betaQuantile,
  checkGrant,
  decide,
  estimateValue,
  proposeCap,
  rankCandidates,
  WEEK_MS,
  type GrantState,
  type Observation,
} from "../src/index.ts";

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const usdc = (x: number) => Math.round(x * 1e6);

const grant = (over: Partial<GrantState> = {}): GrantState => ({
  weeklyBudget: usdc(2),
  perCallCap: usdc(0.1),
  spentThisWeek: 0,
  weekStartMs: NOW - DAY,
  expiresMs: NOW + 30 * DAY,
  revoked: false,
  lastHeartbeatMs: NOW - DAY,
  dormancyMs: 7 * DAY,
  serviceCaps: {},
  ...over,
});

const obs = (useful: number, useless: number, atMs = NOW): Observation[] => [
  ...Array.from({ length: useful }, () => ({ rating: "useful" as const, atMs })),
  ...Array.from({ length: useless }, () => ({ rating: "useless" as const, atMs })),
];

describe("checkGrant", () => {
  it("allows a payment inside every limit", () => {
    expect(checkGrant(grant(), "0xa", usdc(0.02), NOW)).toEqual({ ok: true, spentThisWeek: usdc(0.02) });
  });
  it("denies over per-call cap", () => {
    expect(checkGrant(grant(), "0xa", usdc(0.5), NOW)).toMatchObject({ ok: false, reason: "over_cap" });
  });
  it("allows exactly the cap", () => {
    expect(checkGrant(grant(), "0xa", usdc(0.1), NOW).ok).toBe(true);
  });
  it("applies a tighter service cap", () => {
    expect(checkGrant(grant({ serviceCaps: { "0xa": usdc(0.01) } }), "0xa", usdc(0.02), NOW)).toMatchObject({ reason: "over_cap" });
  });
  it("service cap of 0 blocks the payee", () => {
    expect(checkGrant(grant({ serviceCaps: { "0xa": 0 } }), "0xa", 1, NOW)).toMatchObject({ reason: "over_cap" });
  });
  it("service cap cannot loosen the per-call cap", () => {
    expect(checkGrant(grant({ serviceCaps: { "0xa": usdc(5) } }), "0xa", usdc(0.5), NOW)).toMatchObject({ reason: "over_cap" });
  });
  it("denies over weekly budget", () => {
    expect(checkGrant(grant({ spentThisWeek: usdc(1.95) }), "0xa", usdc(0.1), NOW)).toMatchObject({ reason: "budget" });
  });
  it("resets the weekly counter after a week", () => {
    expect(checkGrant(grant({ spentThisWeek: usdc(2), weekStartMs: NOW - WEEK_MS }), "0xa", usdc(0.1), NOW).ok).toBe(true);
  });
  it("denies when revoked, expired or dormant, in that order", () => {
    expect(checkGrant(grant({ revoked: true, expiresMs: NOW }), "0xa", 1, NOW)).toMatchObject({ reason: "revoked" });
    expect(checkGrant(grant({ expiresMs: NOW }), "0xa", 1, NOW)).toMatchObject({ reason: "expired" });
    expect(checkGrant(grant({ lastHeartbeatMs: NOW - 7 * DAY }), "0xa", 1, NOW)).toMatchObject({ reason: "dormant" });
  });
  it("rejects zero, negative and fractional prices", () => {
    for (const p of [0, -1, 0.5]) expect(checkGrant(grant(), "0xa", p, NOW).ok).toBe(false);
  });
});

describe("beta helpers", () => {
  it("cdf matches the uniform distribution for Beta(1,1)", () => {
    expect(betaCdf(0.3, 1, 1)).toBeCloseTo(0.3, 6);
  });
  it("quantile inverts cdf", () => {
    const q = betaQuantile(0.1, 3, 7);
    expect(betaCdf(q, 3, 7)).toBeCloseTo(0.1, 6);
  });
});

describe("estimateValue", () => {
  it("starts uninformed at 0.5", () => {
    expect(estimateValue([], NOW).pUseful).toBe(0.5);
  });
  it("learns from ratings", () => {
    expect(estimateValue(obs(7, 2), NOW).pUseful).toBeCloseTo(8 / 11, 6);
  });
  it("decays old observations with a 14-day half-life", () => {
    const v = estimateValue(obs(0, 1, NOW - 14 * DAY), NOW);
    expect(v.b).toBeCloseTo(1.5, 6);
  });
});

describe("decide", () => {
  const cand = { service: "summariser", payee: "0xs", price: usdc(0.05), taskType: "wallet-risk" };
  const base = { grant: grant(), candidate: cand, taskValue: usdc(0.5), nowMs: NOW };

  it("skips a service that keeps being useless (memory ON)", () => {
    const d = decide({ ...base, history: obs(0, 5), useMemory: true });
    expect(d).toMatchObject({ action: "skipped", reason: "low_value" });
  });
  it("pays the same service with memory OFF", () => {
    expect(decide({ ...base, history: obs(0, 5), useMemory: false }).action).toBe("pay");
  });
  it("does not judge a service on fewer than 3 calls", () => {
    expect(decide({ ...base, history: obs(0, 2), useMemory: true }).action).toBe("pay");
  });
  it("grant denial beats everything, even with memory OFF", () => {
    const d = decide({ ...base, grant: grant({ revoked: true }), history: [], useMemory: false });
    expect(d).toMatchObject({ action: "denied", reason: "revoked" });
  });
  it("skips paying when a free source is sufficient", () => {
    const d = decide({ ...base, candidate: { ...cand, freeSourceSufficient: true }, history: obs(5, 0), useMemory: true });
    expect(d).toMatchObject({ action: "skipped", reason: "free_source" });
  });
  it("skips when cost per useful answer exceeds the task's value", () => {
    const d = decide({ ...base, taskValue: usdc(0.06), history: obs(0, 2), useMemory: true });
    expect(d).toMatchObject({ action: "skipped", reason: "too_costly" });
  });
});

describe("rankCandidates", () => {
  it("prefers the lowest cost per useful answer, not the lowest price", () => {
    const cheapBad = { service: "cheap", payee: "0x1", price: usdc(0.01), taskType: "t" };
    const pricierGood = { service: "good", payee: "0x2", price: usdc(0.02), taskType: "t" };
    const hist = (c: { service: string }) => (c.service === "cheap" ? obs(0, 20) : obs(20, 0));
    expect(rankCandidates([cheapBad, pricierGood], hist, NOW)[0].service).toBe("good");
  });
});

describe("proposeCap", () => {
  it("proposes blocking a useless service", () => {
    const p = proposeCap("0xs", usdc(0.1), usdc(0.1), usdc(0.05), estimateValue(obs(0, 6), NOW));
    expect(p?.proposedCap).toBe(0);
  });
  it("never proposes above the hard grant cap", () => {
    const p = proposeCap("0xa", usdc(0.02), usdc(0.03), usdc(0.02), estimateValue(obs(20, 0), NOW));
    expect(p?.proposedCap).toBe(usdc(0.03));
  });
  it("proposes nothing when there is not enough evidence", () => {
    expect(proposeCap("0xa", usdc(0.1), usdc(0.1), usdc(0.02), estimateValue(obs(1, 1), NOW))).toBeNull();
  });
});

// Learned value per (service, task type): a recency-decayed Beta posterior over
// "was this paid call useful?". Pure; observations come from value memories.

export type Rating = "useful" | "useless" | "refund";

export interface Observation {
  rating: Rating;
  atMs: number;
}

export interface ValueEstimate {
  n: number;
  a: number;
  b: number;
  pUseful: number;
  /** 10th percentile of the posterior: a pessimistic usefulness estimate. */
  lcb: number;
}

export const HALF_LIFE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export function estimateValue(obs: Observation[], nowMs: number, halfLifeDays = HALF_LIFE_DAYS): ValueEstimate {
  let a = 1;
  let b = 1;
  for (const o of obs) {
    const ageDays = Math.max(0, nowMs - o.atMs) / DAY_MS;
    const w = Math.pow(0.5, ageDays / halfLifeDays);
    if (o.rating === "useful") a += w;
    else b += w;
  }
  return { n: obs.length, a, b, pUseful: a / (a + b), lcb: betaQuantile(0.1, a, b) };
}

export function costPerUseful(price: number, v: ValueEstimate): number {
  return price / v.pUseful;
}

export type ValueDecision = { pay: true } | { pay: false; reason: "low_value" | "too_costly"; detail: string };

export const MIN_OBS = 3;
export const LCB_FLOOR = 0.35;

export function valueCheck(price: number, v: ValueEstimate, taskValue: number): ValueDecision {
  if (v.n >= MIN_OBS && v.lcb < LCB_FLOOR) {
    return { pay: false, reason: "low_value", detail: `useful in about ${Math.round(v.pUseful * 100)}% of the last ${v.n} paid calls` };
  }
  // Too little evidence to judge: pay and learn, rather than skip on the prior alone.
  if (v.n < MIN_OBS) return { pay: true };
  const cpu = costPerUseful(price, v);
  if (cpu > taskValue) {
    return { pay: false, reason: "too_costly", detail: `cost per useful ${Math.round(cpu)} > task value ${taskValue}` };
  }
  return { pay: true };
}

// --- Beta distribution helpers ---

function logGamma(x: number): number {
  // Lanczos approximation (g=7, n=9)
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let s = c[0];
  for (let i = 1; i < 9; i++) s += c[i] / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}

function betacf(x: number, a: number, b: number): number {
  const EPS = 1e-12;
  const TINY = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
export function betaCdf(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnFront = logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  const front = Math.exp(lnFront);
  return x < (a + 1) / (a + b + 2) ? (front * betacf(x, a, b)) / a : 1 - (front * betacf(1 - x, b, a)) / b;
}

export function betaQuantile(p: number, a: number, b: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (betaCdf(mid, a, b) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// The full pre-payment decision, in the blueprint's order (Section 7.1).
// The LLM planner only proposes calls; this decides. Limits never come from the LLM.

import { checkGrant, type DenyReason, type GrantState } from "./grant.ts";
import { costPerUseful, estimateValue, valueCheck, type Observation, type ValueEstimate } from "./value.ts";

export interface Candidate {
  service: string;
  payee: string;
  price: number;
  taskType: string;
  /** A free source (e.g. a Tatum read) already answers this step well enough. */
  freeSourceSufficient?: boolean;
}

export type Decision =
  | { action: "pay"; candidate: Candidate; value: ValueEstimate }
  | { action: "denied"; candidate: Candidate; reason: DenyReason; detail: string }
  | { action: "skipped"; candidate: Candidate; reason: "low_value" | "too_costly" | "free_source"; detail: string; value?: ValueEstimate };

export interface DecideInput {
  grant: GrantState;
  candidate: Candidate;
  history: Observation[];
  taskValue: number;
  nowMs: number;
  /** Memory OFF: ignore learned value (the baseline for the replay). */
  useMemory: boolean;
}

export function decide(i: DecideInput): Decision {
  const { candidate: c } = i;
  const g = checkGrant(i.grant, c.payee, c.price, i.nowMs);
  if (!g.ok) return { action: "denied", candidate: c, reason: g.reason, detail: g.detail };

  const value = estimateValue(i.useMemory ? i.history : [], i.nowMs);
  if (i.useMemory) {
    const v = valueCheck(c.price, value, i.taskValue);
    if (!v.pay) return { action: "skipped", candidate: c, reason: v.reason, detail: v.detail, value };
  }
  if (c.freeSourceSufficient) {
    return { action: "skipped", candidate: c, reason: "free_source", detail: "free Tatum read is sufficient" };
  }
  return { action: "pay", candidate: c, value };
}

/** Order candidates by learned cost per useful answer (cheapest first). */
export function rankCandidates(cands: Candidate[], historyFor: (c: Candidate) => Observation[], nowMs: number): Candidate[] {
  return [...cands].sort(
    (x, y) => costPerUseful(x.price, estimateValue(historyFor(x), nowMs)) - costPerUseful(y.price, estimateValue(historyFor(y), nowMs)),
  );
}

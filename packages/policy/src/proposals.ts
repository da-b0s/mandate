// Weekly cap proposals (Section 7.4). Proposals only; the owner ratifies onchain.

import type { ValueEstimate } from "./value.js";

export interface CapProposal {
  payee: string;
  currentCap: number;
  proposedCap: number;
  reason: string;
}

export function proposeCap(
  payee: string,
  currentCap: number,
  hardCap: number,
  price: number,
  v: ValueEstimate,
  prevCostPerUseful?: number,
): CapProposal | null {
  const cpu = price / v.pUseful;
  if (v.n >= 5 && v.lcb < 0.2 && currentCap !== 0) {
    return { payee, currentCap, proposedCap: 0, reason: `useful in few of ${v.n} calls (lcb ${v.lcb.toFixed(2)}); block` };
  }
  if (prevCostPerUseful !== undefined && cpu > prevCostPerUseful * 1.25 && currentCap > price) {
    return { payee, currentCap, proposedCap: price, reason: "cost per useful answer is rising; cap at current price" };
  }
  if (v.n >= 5 && v.lcb >= 0.7 && currentCap < hardCap && price >= currentCap) {
    return { payee, currentCap, proposedCap: Math.min(hardCap, currentCap * 2), reason: "consistently useful and capped; raise within grant" };
  }
  return null;
}

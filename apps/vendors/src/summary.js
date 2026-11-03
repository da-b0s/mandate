// Premium Summariser: the honest low-value control vendor. It re-packages the same
// free data a wallet risk report uses into longer prose, adding no new facts.
// MANDATE should learn to stop paying for it.
import { walletRiskReport } from "./wallet-risk.js";

export async function premiumSummary(address) {
  const r = await walletRiskReport(address);
  if (r.error) return r;
  return {
    address,
    summary:
      `Executive overview. ${r.summary} ` +
      `Considering the available evidence, the overall risk posture can be characterised as ${r.risk}. ` +
      `As always, counterparties should exercise appropriate diligence before transacting.`,
    note: "Control vendor: no information beyond the wallet risk report.",
    generatedAt: new Date().toISOString(),
  };
}

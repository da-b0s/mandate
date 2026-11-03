// Services the agent may buy from. Prices are what we expect to be quoted;
// the 402 challenge is checked against them before paying.
const VENDORS = process.env.VENDORS_URL ?? "https://mandate-vendors.onrender.com";
const usdc = (x) => Math.round(x * 1e6);

export const SERVICES = [
  {
    service: "wallet-risk",
    name: "Wallet Risk Report",
    price: usdc(0.02),
    taskTypes: ["wallet-risk"],
    url: (t) => `${VENDORS}/v1/wallet-risk?address=${t.subject}`,
  },
  {
    service: "summary",
    name: "Premium Summariser",
    price: usdc(0.05),
    taskTypes: ["wallet-risk"],
    url: (t) => `${VENDORS}/v1/summary?address=${t.subject}`,
  },
  {
    service: "holders",
    name: "Token Holder Check",
    price: usdc(0.03),
    taskTypes: ["token-holders"],
    url: (t) => `${VENDORS}/v1/holders?token=${t.subject}&chain=${t.chain ?? "ethereum-mainnet"}`,
  },
];

/** What a useful answer to each task type is worth to the user (USDC base units). */
export const TASK_VALUE = { "wallet-risk": usdc(0.08), "token-holders": usdc(0.08) };

/** Rule-based classifier: the LLM never decides money, and this keeps replays deterministic. */
export function classify(ask) {
  const sui = ask.match(/0x[0-9a-fA-F]{64}/)?.[0];
  const evm = ask.match(/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/)?.[0];
  const subject = sui ?? evm;
  if (!subject) return { type: "unknown", subject: null };
  if (evm && /\b(token|holders?|coin|contract)\b/i.test(ask)) return { type: "token-holders", subject: evm };
  return { type: "wallet-risk", subject };
}

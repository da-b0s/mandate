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
const UNIT_MS = { minute: 60_000, hour: 3_600_000, day: 86_400_000, week: 604_800_000 };

/**
 * "Send 0.05 USDC to 0x... [every 2 days]" -> a transfer. Only Sui addresses (USDC on Sui).
 * Deliberately strict: money only moves on an unambiguous instruction.
 */
export function parseTransfer(ask) {
  const m = ask.match(/\b(?:send|pay|transfer)\s+\$?(\d+(?:\.\d{1,6})?)\s*(?:usdc|usd|dollars?|\$)?\s+to\s+(0x[0-9a-fA-F]{64})(?![0-9a-fA-F])/i);
  if (!m) return null;
  const amount = Math.round(Number(m[1]) * 1e6);
  if (!(amount > 0)) return null;
  return { type: "transfer", subject: m[2].toLowerCase(), amount, intervalMs: parseInterval(ask) };
}

/** "every 2 days", "daily", "every week" -> milliseconds, or null for a one-off. */
function parseInterval(ask) {
  const every = ask.match(/\bevery\s+(\d+\s*)?(minute|hour|day|week)s?\b/i);
  if (every) return Number(every[1] ?? 1) * UNIT_MS[every[2].toLowerCase()];
  const word = ask.match(/\b(hourly|daily|weekly)\b/i)?.[1].toLowerCase();
  return word ? { hourly: UNIT_MS.hour, daily: UNIT_MS.day, weekly: UNIT_MS.week }[word] : null;
}

/** "Swap 0.05 USDC to SUI", "buy 0.1 USDC of WAL", "convert 1 usdc into deep" -> a swap. */
export function parseSwap(ask) {
  const m = ask.match(/\b(?:swap|convert|exchange|buy|trade)\s+\$?(\d+(?:\.\d{1,6})?)\s*(?:usdc|usd|dollars?|\$)?\s*(?:worth\s+)?(?:of|to|for|into|in)\s+(sui|wal|deep)\b/i);
  if (!m) return null;
  const amount = Math.round(Number(m[1]) * 1e6);
  return amount > 0 ? { type: "swap", subject: m[2].toUpperCase(), amount, intervalMs: parseInterval(ask) } : null;
}

export function classify(ask) {
  const transfer = parseTransfer(ask);
  if (transfer) return transfer;
  const swap = parseSwap(ask);
  if (swap) return swap;
  const sui = ask.match(/0x[0-9a-fA-F]{64}/)?.[0];
  const evm = ask.match(/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/)?.[0];
  const subject = sui ?? evm;
  if (!subject) return { type: "unknown", subject: null };
  if (evm && /\b(token|holders?|coin|contract)\b/i.test(ask)) return { type: "token-holders", subject: evm };
  return { type: "wallet-risk", subject };
}

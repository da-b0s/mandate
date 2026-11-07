/** Human names for vendor services and task types. */
export const SERVICE_NAMES: Record<string, string> = {
  "wallet-risk": "Wallet Risk Report",
  summary: "Premium Summariser",
  holders: "Token Holder Check",
  transfer: "Transfer",
  swap: "Swap",
};
export const serviceName = (s: string) => SERVICE_NAMES[s] ?? s;
export const TASK_TYPES: Record<string, string> = { "wallet-risk": "for wallet checks", "token-holders": "for token checks" };

/** Plain-language reasons the mandate or memory stopped a purchase. */
export const REASONS: Record<string, string> = {
  over_cap: "over the per-call limit",
  budget: "this week's budget is used up",
  revoked: "the mandate was revoked",
  expired: "the mandate has expired",
  dormant: "the owner's heartbeat is overdue",
  funds: "not enough USDC in the mandate",
  low_value: "rarely worth it lately",
  preference: "you asked it not to",
  free_source: "the free check already answers this",
};
export const reason = (r: string) => REASONS[r] ?? r.replaceAll("_", " ");

export const usdc = (base: number | null | undefined) => (base == null ? "—" : `${(base / 1e6).toFixed(2)} USDC`);
export const short = (s?: string | null, n = 6) => (s ? `${s.slice(0, n)}…${s.slice(-4)}` : "");
export const suiscanTx = (d: string) => `https://suiscan.xyz/mainnet/tx/${d}`;
export const suiscanObj = (id: string) => `https://suiscan.xyz/mainnet/object/${id}`;
export const walruscan = (blob: string) => `https://walruscan.com/mainnet/blob/${blob}`;

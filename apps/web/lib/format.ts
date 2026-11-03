export const usdc = (base: number | null | undefined) => (base == null ? "—" : `${(base / 1e6).toFixed(2)} USDC`);
export const short = (s?: string | null, n = 6) => (s ? `${s.slice(0, n)}…${s.slice(-4)}` : "");
export const suiscanTx = (d: string) => `https://suiscan.xyz/mainnet/tx/${d}`;
export const suiscanObj = (id: string) => `https://suiscan.xyz/mainnet/object/${id}`;
export const walruscan = (blob: string) => `https://walruscan.com/mainnet/blob/${blob}`;

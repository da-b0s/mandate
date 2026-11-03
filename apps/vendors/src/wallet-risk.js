// Wallet Risk Report: sanctions/malicious-address screening via Tatum's security API,
// plus live Sui balances via Tatum gRPC for Sui addresses.
import { tatum } from "@mandate/chain";

const SUI_ADDR = /^0x[0-9a-fA-F]{64}$/;
const EVM_ADDR = /^0x[0-9a-fA-F]{40}$/;

async function screen(address) {
  const res = await fetch(`https://api.tatum.io/v3/security/address/${address}`, {
    headers: { "x-api-key": process.env.TATUM_API_KEY },
  });
  if (!res.ok) throw new Error(`Tatum security API ${res.status}`);
  const j = await res.json();
  return { flagged: j.status === "invalid", source: j.source ?? null, category: j.category ?? null, description: j.description ?? null };
}

export async function walletRiskReport(address) {
  if (!SUI_ADDR.test(address) && !EVM_ADDR.test(address)) {
    return { error: "address must be a 0x Sui (32-byte) or EVM (20-byte) address" };
  }
  const chain = SUI_ADDR.test(address) ? "sui" : "evm";
  const screening = await screen(address);
  let holdings = null;
  if (chain === "sui") {
    const { balances } = await tatum.listBalances({ owner: address });
    holdings = balances.map((b) => ({ coinType: b.coinType, balance: b.balance }));
  }
  const risk = screening.flagged ? "high" : holdings && holdings.length === 0 ? "unknown" : "low";
  return {
    address,
    chain,
    risk,
    screening,
    holdings,
    summary: screening.flagged
      ? `Flagged by ${screening.source}: ${screening.description}. Do not transact.`
      : `No sanctions or malicious-address match.${holdings ? ` Holds ${holdings.length} coin type(s) on Sui.` : ""}`,
    sources: ["Tatum security API", ...(chain === "sui" ? ["Tatum Sui gRPC"] : [])],
    generatedAt: new Date().toISOString(),
  };
}

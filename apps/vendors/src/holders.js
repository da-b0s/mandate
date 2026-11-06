// Token Holder Check (EVM): token profile plus a sample of holders screened
// against Tatum's sanctions/malicious-address data.
import { screenAddress, tatumGet } from "./tatum-data.js";

const CHAINS = new Set(["ethereum-mainnet", "base-mainnet", "arb-one-mainnet", "polygon-mainnet", "bsc-mainnet"]);
// Each sampled holder costs one Tatum security call; 5 keeps the check useful and the credits low.
const SAMPLE = 5;

export async function holderCheck(token, chain = "ethereum-mainnet") {
  if (!/^0x[0-9a-fA-F]{40}$/.test(token)) return { error: "token must be an EVM contract address" };
  if (!CHAINS.has(chain)) return { error: `chain must be one of ${[...CHAINS].join(", ")}` };
  const q = `chain=${chain}&tokenAddress=${token}`;
  const [profile, owners] = await Promise.all([tatumGet(`/v4/data/tokens?${q}`), tatumGet(`/v4/data/owners?${q}&pageSize=${SAMPLE}`)]);
  const screened = await Promise.all(owners.map(async (a) => ({ address: a, ...(await screenAddress(a)) })));
  const flagged = screened.filter((h) => h.flagged);
  return {
    token,
    chain,
    profile: { name: profile.name, symbol: profile.symbol, decimals: profile.decimals, supply: profile.supply },
    sampledHolders: screened.length,
    flaggedHolders: flagged,
    risk: flagged.length > 0 ? "elevated" : "low",
    summary: `${profile.name} (${profile.symbol}): ${flagged.length} of ${screened.length} sampled holders flagged.`,
    sources: ["Tatum Data API tokens", "Tatum Data API owners", "Tatum security API"],
    generatedAt: new Date().toISOString(),
  };
}

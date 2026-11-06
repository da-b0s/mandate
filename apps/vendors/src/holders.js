// Token Holder Check (EVM): token profile plus a sample of holders screened
// against Tatum's sanctions/malicious-address data.
import { screenAddress, tatumGet } from "./tatum-data.js";

const CHAINS = new Set(["ethereum-mainnet", "base-mainnet", "arb-one-mainnet", "polygon-mainnet", "bsc-mainnet"]);
// Each sampled holder costs one Tatum security call; 5 keeps the check useful and the credits low.
const SAMPLE = 5;

// The check runs twice per sale (quote, then paid request), so keep the profile to spend one Tatum call.
const profiles = new Map();
const PROFILE_TTL_MS = 10 * 60_000;

async function tokenProfile(token, chain) {
  const key = `${chain}:${token.toLowerCase()}`;
  const hit = profiles.get(key);
  if (hit && Date.now() - hit.at < PROFILE_TTL_MS) return hit.profile;
  const profile = await tatumGet(`/v4/data/tokens?chain=${chain}&tokenAddress=${token}`);
  if (profiles.size > 500) profiles.clear();
  profiles.set(key, { at: Date.now(), profile });
  return profile;
}

/** Runs before charging. Returns why this request cannot be served, or null if it can. */
export async function holderPrecheck(token, chain = "ethereum-mainnet") {
  if (!/^0x[0-9a-fA-F]{40}$/.test(token)) return "token must be an EVM contract address";
  if (!CHAINS.has(chain)) return `chain must be one of ${[...CHAINS].join(", ")}`;
  return tokenProfile(token, chain).then(
    () => null,
    () => "no token data available for this address, so nothing was charged",
  );
}

export async function holderCheck(token, chain = "ethereum-mainnet") {
  const q = `chain=${chain}&tokenAddress=${token}`;
  const [profile, owners] = await Promise.all([tokenProfile(token, chain), tatumGet(`/v4/data/owners?${q}&pageSize=${SAMPLE}`)]);
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

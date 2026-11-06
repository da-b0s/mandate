// Tatum Data API (REST): free reads the agent and the vendors share.
import "dotenv/config";

const BASE = "https://api.tatum.io";

export async function tatumGet(path) {
  for (let i = 1; ; i++) {
    const res = await fetch(BASE + path, { headers: { "x-api-key": process.env.TATUM_API_KEY }, signal: AbortSignal.timeout(20_000) });
    if (res.ok) return res.json();
    if (res.status !== 429 || i >= 4) throw new Error(`Tatum ${path.split("?")[0]} ${res.status}`);
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
}

// Sanctions lists change slowly; reuse a screen result for an hour to save Tatum credits.
const screens = new Map();
const SCREEN_TTL_MS = 3_600_000;

/** Sanctions / malicious-address screen (OFAC and others). */
export async function screenAddress(address) {
  const key = address.toLowerCase();
  const hit = screens.get(key);
  if (hit && Date.now() - hit.at < SCREEN_TTL_MS) return hit.value;
  const j = await tatumGet(`/v3/security/address/${address}`);
  const value = { flagged: j.status === "invalid", source: j.source ?? null, category: j.category ?? null, description: j.description ?? null };
  if (screens.size > 5000) screens.clear();
  screens.set(key, { at: Date.now(), value });
  return value;
}

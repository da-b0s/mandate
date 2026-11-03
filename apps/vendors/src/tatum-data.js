// Small Tatum Data API helpers shared by the vendor services.
const BASE = "https://api.tatum.io";

export async function tatumGet(path) {
  const res = await fetch(BASE + path, { headers: { "x-api-key": process.env.TATUM_API_KEY } });
  if (!res.ok) throw new Error(`Tatum ${path.split("?")[0]} ${res.status}`);
  return res.json();
}

export async function screenAddress(address) {
  const j = await tatumGet(`/v3/security/address/${address}`);
  return { flagged: j.status === "invalid", source: j.source ?? null, category: j.category ?? null, description: j.description ?? null };
}

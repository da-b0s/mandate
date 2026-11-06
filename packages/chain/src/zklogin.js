// zkLogin via Shinami (server side only: Shinami Wallet Services reject browser calls).
// The browser keeps the ephemeral key and signs; the server fetches the user's salt/address and the zk proof.
import "dotenv/config";
import { decodeJwt, genAddressSeed } from "@mysten/sui/zklogin";
import { tatum } from "./tatum.js";

async function shinami(path, method, params) {
  const key = process.env.SHINAMI_WALLET_ACCESS_KEY;
  if (!key) throw new Error("SHINAMI_WALLET_ACCESS_KEY is not set");
  for (let i = 1; ; i++) {
    const res = await fetch(`https://api.us1.shinami.com/sui/${path}/v1`, {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: AbortSignal.timeout(60_000),
    });
    const j = await res.json();
    if (!j.error) return j.result;
    // -32010 = QPS limit (retry); -32012 = per-address proof limit or monthly cap (do not retry).
    if (j.error.code !== -32010 || i >= 4) throw new Error(`Shinami ${method}: ${j.error.message}`);
    await new Promise((r) => setTimeout(r, 500 * 2 ** i));
  }
}

export async function currentEpoch() {
  const s = await tatum.core.getCurrentSystemState();
  return Number(s.systemState.epoch);
}

/** JWT + ephemeral key data -> the user's zkLogin address and everything the browser needs to sign. */
export async function zkLogin({ jwt, maxEpoch, extendedEphemeralPublicKey, randomness }) {
  const claims = decodeJwt(jwt);
  const allowed = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (claims.iss !== "https://accounts.google.com" || (allowed && claims.aud !== allowed)) throw new Error("token is not from our Google client");
  const wallet = await shinami("zkwallet", "shinami_zkw_getOrCreateZkLoginWallet", [jwt]);
  const proof = await shinami("zkprover", "shinami_zkp_createZkLoginProof", [jwt, String(maxEpoch), extendedEphemeralPublicKey, randomness, wallet.salt]);
  const salt = BigInt("0x" + Buffer.from(wallet.salt, "base64").toString("hex"));
  const addressSeed = genAddressSeed(salt, "sub", claims.sub, claims.aud).toString();
  return { address: wallet.address, addressSeed, proof: proof.zkProof, maxEpoch, email: claims.email ?? null };
}

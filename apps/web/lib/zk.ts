"use client";
// zkLogin in the browser: an ephemeral key signs, a Google login binds it to the user's address,
// and the zk proof (fetched by our server from Shinami) makes the signature valid on Sui.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, getZkLoginSignature } from "@mysten/sui/zklogin";

const PENDING = "mandate.zk.pending";
const SESSION = "mandate.zk.session";
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export type ZkSession = { address: string; addressSeed: string; proof: any; maxEpoch: number; secret: string; email: string | null };

export const googleLoginAvailable = Boolean(GOOGLE_CLIENT_ID);

const read = <T,>(k: string): T | null => {
  try {
    const v = sessionStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
};

export function zkSession(): ZkSession | null {
  return read<ZkSession>(SESSION);
}

export function zkSignOut() {
  sessionStorage.removeItem(SESSION);
}

export async function startGoogleLogin() {
  const { epoch } = await fetch("/api/zk/epoch").then((r) => r.json());
  const maxEpoch = Number(epoch) + 2; // about two days
  const ephemeral = new Ed25519Keypair();
  const randomness = generateRandomness();
  const nonce = generateNonce(ephemeral.getPublicKey(), maxEpoch, randomness);
  sessionStorage.setItem(PENDING, JSON.stringify({ secret: ephemeral.getSecretKey(), maxEpoch, randomness: String(randomness), returnTo: location.pathname }));
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    response_type: "id_token",
    redirect_uri: `${location.origin}/`,
    scope: "openid email",
    nonce,
  });
  location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Call on page load: finishes a Google redirect if one just happened. Returns the path to go back to. */
export async function completeGoogleLogin(): Promise<string | null> {
  const jwt = new URLSearchParams(location.hash.slice(1)).get("id_token");
  const pending = read<{ secret: string; maxEpoch: number; randomness: string; returnTo: string }>(PENDING);
  if (!jwt || !pending) return null;
  history.replaceState(null, "", location.pathname);
  sessionStorage.removeItem(PENDING);
  const ephemeral = Ed25519Keypair.fromSecretKey(pending.secret);
  const res = await fetch("/api/zk/login", {
    method: "POST",
    body: JSON.stringify({
      jwt,
      maxEpoch: pending.maxEpoch,
      extendedEphemeralPublicKey: getExtendedEphemeralPublicKey(ephemeral.getPublicKey()),
      randomness: pending.randomness,
    }),
  }).then((r) => r.json());
  if (res.error) throw new Error(res.error);
  const session: ZkSession = { ...res, secret: pending.secret };
  sessionStorage.setItem(SESSION, JSON.stringify(session));
  return pending.returnTo || "/";
}

function zkSignature(s: ZkSession, userSignature: string) {
  return getZkLoginSignature({ inputs: { ...s.proof, addressSeed: s.addressSeed }, maxEpoch: s.maxEpoch, userSignature });
}

export async function zkSignTransaction(s: ZkSession, bytesB64: string) {
  const bytes = Uint8Array.from(atob(bytesB64), (c) => c.charCodeAt(0));
  const { signature } = await Ed25519Keypair.fromSecretKey(s.secret).signTransaction(bytes);
  return zkSignature(s, signature);
}

export async function zkSignMessage(s: ZkSession, message: Uint8Array) {
  const { signature } = await Ed25519Keypair.fromSecretKey(s.secret).signPersonalMessage(message);
  return zkSignature(s, signature);
}

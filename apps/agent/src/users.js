// Every signed-in person gets their own agent: a server-held wallet (key encrypted at rest) that
// pays only within the grant they own. The platform key sponsors gas, so users only need USDC.
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { agentSigner, readGrant } from "@mandate/chain";
import { decryptSecret, encryptSecret, getAgentRow, insertAgentRow, setAgentGrant } from "@mandate/store";
import { withAgent } from "./context.js";

const ADDR = /^0x[0-9a-f]{64}$/;

export async function getUserAgent(owner) {
  if (!ADDR.test(owner)) throw new Error("bad owner address");
  const row = await getAgentRow(owner);
  return row ? { owner, agentAddress: row.agent_address, grantId: row.grant_id, credited: Boolean(row.credit_digest) } : null;
}

export async function createUserAgent(owner) {
  const existing = await getUserAgent(owner);
  if (existing) return existing;
  const kp = new Ed25519Keypair();
  await insertAgentRow({ owner, agentAddress: kp.toSuiAddress(), encKey: encryptSecret(kp.getSecretKey()) });
  return getUserAgent(owner);
}

/** Adopt a grant for this user: they must own it and it must name their agent. */
export async function setUserGrant(owner, grantId) {
  const agent = await getUserAgent(owner);
  if (!agent) throw new Error("create your agent first");
  const g = await readGrant(grantId);
  if (g.owner !== owner) throw new Error("you do not own this grant");
  if (g.agent !== agent.agentAddress) throw new Error("this grant names a different agent");
  await setAgentGrant(owner, grantId);
  return g;
}

async function signerFor(owner) {
  const row = await getAgentRow(owner);
  if (!row) throw new Error("no agent for this user");
  return Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(decryptSecret(row.enc_key)).secretKey);
}

/** Memory prefix per user (namespaces must stay short and stable). */
export const userMemoryPrefix = (owner) => `mandate-u${owner.slice(2, 14)}`;

/**
 * Run fn as this user's agent: their signer, their grant, their memory; platform sponsors gas.
 * { setup: true } allows a user with an agent but no grant yet (creating their first mandate).
 */
export async function asUser(owner, fn, { setup = false } = {}) {
  const agent = await getUserAgent(owner);
  if (!agent) throw new Error("create your agent first");
  if (!agent.grantId && !setup) throw new Error("finish setting up your mandate first");
  const signer = await signerFor(owner);
  return withAgent({ owner, signer, grantId: agent.grantId, memoryPrefix: userMemoryPrefix(owner), sponsor: agentSigner() }, fn);
}

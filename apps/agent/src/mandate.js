// Which grant the agent spends under, and who owns it.
// A signed-in user's context names their own grant and owner. The demo agent (no context) uses
// GRANT_ID, or a grant its owner adopted from the app, but only one with the same owner and this
// agent, so nobody else can point our agent at limits they control.
import { readGrant } from "@mandate/chain";
import { getSetting, setSetting } from "@mandate/store";
import { currentGrantOverride, currentOwner, currentSigner } from "./context.js";

export function agentAddress() {
  return currentSigner().toSuiAddress();
}

export async function appOwner() {
  return currentOwner() ?? (await readGrant(process.env.GRANT_ID)).owner;
}

// Keyed by agent: local and hosted apps share one database but run different agents.
const settingKey = () => `active_grant:${agentAddress()}`;

export async function activeGrantId() {
  return currentGrantOverride() ?? (await getSetting(settingKey()).catch(() => null)) ?? process.env.GRANT_ID;
}

export async function adoptGrant(grantId) {
  const [g, owner] = await Promise.all([readGrant(grantId), appOwner()]);
  if (g.owner !== owner) throw new Error("grant is not owned by this app's owner");
  if (g.agent !== agentAddress()) throw new Error("grant does not name this app's agent");
  await setSetting(settingKey(), grantId);
  return g;
}

// Which grant the agent spends under. The owner can create a new grant from the app;
// the app adopts it only if it has the same owner as the configured grant (GRANT_ID),
// so nobody else can point our agent at limits they control.
import { agentSigner, readGrant } from "@mandate/chain";
import { getSetting, setSetting } from "@mandate/store";

export async function appOwner() {
  return (await readGrant(process.env.GRANT_ID)).owner;
}

// Keyed by agent: local and hosted apps share one database but run different agents.
const settingKey = () => `active_grant:${agentAddress()}`;

export async function activeGrantId() {
  return (await getSetting(settingKey()).catch(() => null)) ?? process.env.GRANT_ID;
}

export function agentAddress() {
  return agentSigner().toSuiAddress();
}

export async function adoptGrant(grantId) {
  const [g, owner] = await Promise.all([readGrant(grantId), appOwner()]);
  if (g.owner !== owner) throw new Error("grant is not owned by this app's owner");
  if (g.agent !== agentAddress()) throw new Error("grant does not name this app's agent");
  await setSetting(settingKey(), grantId);
  return g;
}

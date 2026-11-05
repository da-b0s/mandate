// Which agent is acting: per request, the signed-in user's own agent; otherwise the demo agent
// configured by env (AGENT_SUI_KEY, GRANT_ID). Code reads it from here instead of threading it through.
import { AsyncLocalStorage } from "node:async_hooks";
import { agentSigner } from "@mandate/chain";

const als = new AsyncLocalStorage();

/** Run fn as a particular user's agent: { owner, signer, grantId, memoryPrefix, sponsor }. */
export const withAgent = (ctx, fn) => als.run(ctx, fn);

const current = () => als.getStore() ?? null;

export const currentOwner = () => current()?.owner ?? null;
export const currentSigner = () => current()?.signer ?? agentSigner();
export const currentSponsor = () => current()?.sponsor ?? null;
export const currentGrantOverride = () => current()?.grantId ?? null;
/** Memory namespace prefix: users get their own; the demo keeps the original names. */
export const memoryPrefix = () => current()?.memoryPrefix ?? "mandate";

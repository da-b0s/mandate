// Server-only bridge to the agent package (plain Node ESM, loaded at runtime).
import "server-only";

type Agent = typeof import("@mandate/agent");
type Chain = typeof import("@mandate/chain");

export const agent = (): Promise<Agent> => import("@mandate/agent");
export const chain = (): Promise<Chain> => import("@mandate/chain");

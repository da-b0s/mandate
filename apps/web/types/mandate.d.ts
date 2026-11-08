// The agent packages are plain JS; type the surface the web app uses.
declare module "@mandate/agent" {
  export function runTask(opts: { ask: string; useMemory?: boolean; grantId?: string; onStep?: (s: unknown) => void }): Promise<any>;
  export function rateTask(taskId: string, ratings: Record<string, string>): Promise<any>;
  export function loadReceipt(taskId: string): Promise<any>;
  export function listReceipts(o?: { light?: boolean; all?: boolean }): Promise<any[]>;
  export function replayRuns(): any[];
  export function valueStats(): Promise<any>;
  export function proofData(): Promise<any>;
  export function capProposals(grantId?: string): Promise<any>;
  export function recordRatification(o: { grantId: string; digest: string }): Promise<any>;
  export function activeGrantId(): Promise<string>;
  export function adoptGrant(grantId: string): Promise<any>;
  export function agentAddress(): string;
  export function appOwner(): Promise<string>;
  export function savePreference(text: string): Promise<any[]>;
  export function runDueSchedules(): Promise<number>;
  export function getUserAgent(owner: string): Promise<{ owner: string; agentAddress: string; grantId: string | null; credited: boolean } | null>;
  export function createUserAgent(owner: string): Promise<any>;
  export function setUserGrant(owner: string, grantId: string): Promise<any>;
  export function sweepWallet(grantId: string): Promise<string | null>;
  export const CREDIT_AMOUNT: number;
  export function creditsLeft(): Promise<number>;
  export function grantWelcomeCredit(owner: string, grantId: string): Promise<{ digest?: string; amount?: number; skipped?: string }>;
  export function asUser<T>(owner: string, fn: () => Promise<T>, o?: { setup?: boolean }): Promise<T>;
  export function recallPreferences(): Promise<any[]>;
}
declare module "@mandate/chain" {
  export function readGrant(grantId: string | undefined): Promise<any>;
  export function setServiceCapTx(o: { grantId: string; payee: string; cap: number }): any;
  export function heartbeatTx(o: { grantId: string }): any;
  export function withdrawTx(o: { grantId: string; amount: number }): any;
  export function readVault(grantId: string): Promise<number>;
  export const OWNER_COINS: Record<string, { type: string; decimals: number }>;
  export function ownerBalances(address: string): Promise<{ symbol: string; decimals: number; balance: string }[]>;
  export function ownerSendTx(o: { symbol: string; amount: bigint | number | string; to: string }): any;
  export const USDC_TYPE: string;
  export function revokeTx(o: { grantId: string }): any;
  export function createGrantTx(o: { agent: string; weeklyBudget: number; perCallCap: number; expiresMs: number; dormancyMs: number }): any;
  export function buildFor(tx: any, sender: string, o?: { sponsor?: any }): Promise<string>;
  export function submitSigned(bytes: string, signature: string, o?: { sponsor?: any }): Promise<any>;
  export function agentSigner(): any;
  export function currentEpoch(): Promise<number>;
  export function zkLogin(o: { jwt: string; maxEpoch: number; extendedEphemeralPublicKey: string; randomness: string }): Promise<any>;
  export const fullnode: any;
  export const tatum: any;
}
declare module "@mandate/store" {
  export function listSchedules(owner: string): Promise<any[]>;
  export function cancelSchedule(owner: string, id: number): Promise<boolean>;
}

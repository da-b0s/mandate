// The agent packages are plain JS; type the surface the web app uses.
declare module "@mandate/agent" {
  export function runTask(opts: { ask: string; useMemory?: boolean; grantId?: string; onStep?: (s: unknown) => void }): Promise<any>;
  export function rateTask(taskId: string, ratings: Record<string, string>): Promise<any>;
  export function loadReceipt(taskId: string): Promise<any>;
  export function listReceipts(): Promise<any[]>;
  export function valueStats(): Promise<any>;
  export function proofData(): Promise<any>;
  export function capProposals(grantId?: string): Promise<any>;
  export function recordRatification(o: { grantId: string; digest: string }): Promise<any>;
}
declare module "@mandate/chain" {
  export function readGrant(grantId: string | undefined): Promise<any>;
  export function setServiceCapTx(o: { grantId: string; payee: string; cap: number }): any;
  export function heartbeatTx(o: { grantId: string }): any;
  export function revokeTx(o: { grantId: string }): any;
  export function buildFor(tx: any, sender: string): Promise<string>;
  export function submitSigned(bytes: string, signature: string): Promise<any>;
}

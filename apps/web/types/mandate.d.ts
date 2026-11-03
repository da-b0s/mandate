// The agent packages are plain JS; type the surface the web app uses.
declare module "@mandate/agent" {
  export function runTask(opts: { ask: string; useMemory?: boolean; grantId?: string; onStep?: (s: unknown) => void }): Promise<any>;
  export function rateTask(taskId: string, ratings: Record<string, string>): Promise<any>;
  export function loadReceipt(taskId: string): Promise<any>;
  export function listReceipts(): Promise<any[]>;
  export function valueStats(): Promise<any>;
}
declare module "@mandate/chain" {
  export function readGrant(grantId: string | undefined): Promise<any>;
}

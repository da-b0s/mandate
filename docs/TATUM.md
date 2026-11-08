# Tatum in MANDATE

MANDATE runs on **Tatum's paid plan** (Starter: 4M credits a month, 200 requests per second). Every
read the agent makes and every transaction it builds, submits and confirms goes through Tatum.

Three things talk to the chain without us choosing the endpoint, and are not on the agent's path:
the vendors' own payment check inside `@suimpp/mpp` (see [LIMITATIONS.md](LIMITATIONS.md); the buyer
always re-verifies through Tatum), Aftermath's routing service when it prices a swap, and the
one-off publish and upgrade scripts for the Move package.

## Sui mainnet gRPC gateway (the core path)

Client: `packages/chain/src/tatum.js`. A `SuiGrpcClient` over native gRPC to
`sui-mainnet-grpc.gateway.tatum.io:443`, authenticated with the API key, wrapped so every call
retries on rate limits and dropped connections.

| What | Where | How often |
| --- | --- | --- |
| Read a mandate (limits, counters, owner, agent) | `packages/chain/src/grant.js` `readGrant` | before every payment, transfer and swap, and on every page that shows the mandate |
| Read the vault balance (dynamic field) | `grant.js` `readVault` | before spending, and in the UI |
| Balances (USDC held by an agent, sponsor gas) | `apps/agent/src/custody.js`, `apps/web/app/api/me`, `lib/sponsor-guard.ts` | per task and page view (cached) |
| Build transactions (gas price, dry run) | `packages/chain/src/wallet.js` `execute`, `buildFor` | every transaction |
| Submit and confirm transactions | `wallet.js` `executeNow`, `submitSigned` | every payment, transfer, swap, deposit, withdrawal, owner action |
| **Verify payments independently** | `apps/agent/src/pay.js` `verifyPayment`, `transfer.js`, `swap.js` | every single payment: **213 of 213** |
| Events (approved caps, swaps) | `apps/agent/src/proposals.js`, `swap.js` | on approval and swap |
| zkLogin: current epoch, signature verification | `packages/chain/src/zklogin.js` | at Google sign-in |

## Tatum Data API and security API

Client: `packages/chain/src/data.js`, shared by the agent and the vendors.

| What | Where |
| --- | --- |
| **Free first check**: is this address sanctioned or malicious? (`/v3/security/address`) | `apps/agent/src/agent.js`, before any purchase. A flagged address is answered without spending. |
| Wallet Risk Report vendor: security screen plus live Sui balances | `apps/vendors/src/wallet-risk.js` |
| Token Holder Check vendor: token profile (`/v4/data/tokens`), holders (`/v4/data/owners`), each holder screened | `apps/vendors/src/holders.js` |
| Pre-check before charging: the vendor confirms Tatum has data for a token before quoting a price | `holders.js` `holderPrecheck` |

## Tatum Storage API (Walrus)

`apps/agent/src/archive.js` uploads the full report of each paid task (every step, every vendor
output) to Walrus through `/v4/data/storage/upload`. The returned blob ID is stored in the receipt
and in the receipt memory, so a receipt points to its full evidence. Uploads are capped at 20 a day
because each costs about 3,000 credits.

## Usage

On the free plan the app used about 100,000 credits during the build, of which about 86,000 were
Walrus storage charges for report archives and about 14,000 were everything else, including the
50-task replays. That is why archives are now limited to paid tasks and 20 a day. The paid plan
leaves ample room for judging.

## Find it in the code in one minute

- `packages/chain/src/tatum.js`: the gateway client.
- `apps/agent/src/pay.js`: `readGrant` before paying, `execute` through Tatum, `verifyPayment` after.
- `apps/agent/src/agent.js`: the free Tatum security check at the top of every wallet task.

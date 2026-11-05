# Ask Claude Code about your agent's memory

MANDATE's agent writes everything it learns to Walrus Memory: receipts, payments, what each vendor
was worth, and the limits you approved. The same memory is readable from any MCP client. This repo
ships a `.mcp.json` that adds the official Walrus Memory MCP server (`@mysten-incubation/memwal-mcp`
0.1.0, installed as a dev dependency by `pnpm install`) to Claude Code when you open this folder. It
runs with plain `node` (starts in under a second on Windows, macOS and Linux). Auto-save is off, so it
only reads unless you ask it to remember something.

## Set up (once)

1. Run `pnpm install`, then open this folder in Claude Code and approve the `memwal` MCP server.
2. Ask Claude to run `memwal_login`. A browser page opens; sign in with the wallet that owns the
   Walrus Memory account the agent writes to.

## Ask

| Namespace | Ask |
| --- | --- |
| `mandate-receipts` | "Recall from mandate-receipts: what did my agent buy recently, what did it cost, and what did it skip and why?" |
| `mandate-value-summary-wallet-risk` | "Recall from that namespace: why does my agent no longer pay for the Premium Summariser?" |
| `mandate-policy` | "Recall from mandate-policy: which caps did I approve, and in which Sui transaction?" |
| `mandate-prefs` | "Recall from mandate-prefs: what preferences did I give my agent?" |

A signed-in user's own agent uses namespaces prefixed `mandate-u<first 12 hex of their address>`,
for example `mandate-u0520a2fd4bee-receipts`.

Receipt and spend memories written from 6 November carry `at` (ISO time), `currency`, and amounts in
USDC (`usdc`, `totalUsdc`) as well as base units, so answers can say "when" and "how much" without
guessing. Search ranks by relevance; ask for "the most recent" and Claude can sort by `at`.

Every answer carries the Walrus blob IDs, so you can check it against the receipts and the Proof page.

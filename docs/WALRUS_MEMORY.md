# Walrus Memory in MANDATE

The agent's memory is Walrus Memory, used through the official `@mysten-incubation/memwal` SDK and
the official relayer. MANDATE builds on it; it does not reimplement storage, search or encryption.
Client: `apps/agent/src/memory.js`. At the time of writing the account holds **622 memories in 33
namespaces** ([live count](https://mandate-gules-five.vercel.app/explorer)).

## What is stored

| Namespace | What | Written | Read |
| --- | --- | --- | --- |
| `mandate-value-<service>-<taskType>` | Versioned value records: each rating of a paid source, with the running usefulness estimate | after every rating | before every purchase, to decide whether a service is worth paying for |
| `mandate-receipts` | One memory per task: what was asked, the plan, payments with digests and USDC amounts, what was skipped and why, the answer, the archived report's blob ID | after every task | by the owner, in the app or in Claude Code |
| `mandate-spend` | One memory per payment, with its digest | after every payment | for spend questions |
| `mandate-policy` | Every cap the owner approved, with its Sui transaction digest | on approval | by the agent when proposing changes |
| `mandate-prefs` | Owner preferences, as facts extracted by `analyze()` | when the owner adds one | before every purchase |

Each signed-in user's agent uses its own prefix (`mandate-u<first 12 hex of their address>-...`), so
one person's learning never mixes with another's.

Records carry a small envelope (`[mdt1|<kind>|<key>|v<n>] <json>`) so versions can be ordered and
parsed, plus an ISO time and human-readable amounts, so other tools can answer "when" and "how much".

## How memory changes behaviour

1. Before buying, the agent recalls the latest value record for each candidate service.
2. `packages/policy` turns the ratings into a Beta posterior. After three or more ratings, if the
   10th percentile of usefulness is below 0.35, the service is skipped.
3. The owner's preferences, recalled from `mandate-prefs`, can only make the agent spend less.
4. From the same records the agent proposes caps (for example, block a service that is rarely
   useful). A proposal changes nothing until the owner signs it onchain; the approval is then
   remembered in `mandate-policy` with its digest.

The measured effect, on 50 identical tasks with real payments: wasted spend **-86%** (1.25 to 0.18
USDC), cost per useful answer **-43%**. Method and raw data: [PROOF.md](PROOF.md).

## Walrus Memory features used

- `remember` (non-blocking, with background confirmation) and `recall` with `sort: "recent"`.
- `analyze()` to turn free text ("never pay more than 0.03 for a single call") into stored facts.
- Namespace listing for the live memory counts on the Explorer.

## Lessons from building on it

- **One namespace per (service, task type).** In one shared namespace, recall ranks by relevance,
  so a busy service's older records crowded out the newest one. Splitting fixed "forgetting".
- **Writes take 30 to 40 seconds to land.** Ratings return immediately: the new value is cached in
  process and written in the background, and the cache wins until Walrus catches up.
- **Recall is cached for 30 seconds** so page loads do not repeat the same search.

## Portable memory

The same memory is readable from any MCP client. The repo ships a `.mcp.json` that adds the official
Walrus Memory MCP server to Claude Code; ask it *"what did my agent buy this week and why did it stop
paying for the Premium Summariser?"*. Setup: [claude-code.md](claude-code.md).

## Archives

Full task reports (larger than a memory) are stored as Walrus blobs through Tatum's Storage API, and
the blob ID goes into the receipt memory. See [TATUM.md](TATUM.md).

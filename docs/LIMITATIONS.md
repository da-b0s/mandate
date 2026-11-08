# Limitations

Known gaps, stated plainly.

## Trust and custody

- **Agent keys are held by our server.** Spending is bounded by each mandate's limits and the owner
  can revoke and withdraw at any time, but the operator could spend within those limits. See
  [THREAT_MODEL.md](THREAT_MODEL.md).
- **The Walrus Memory relayer sees plaintext** before encryption, as the official relayer does.

## Payments and vendors

- **All three data services are ours.** They are real, separately deployed MPP services that charge
  real USDC, but no third-party vendor is integrated yet. Any MPP-compatible service can be added to
  the catalogue.
- **Vendor-side verification does not use Tatum.** `@suimpp/mpp`'s server checks payments with its
  own gRPC client against a public node and cannot be pointed at Tatum without patching the library.
  The buyer side always verifies through Tatum.
- **Swaps depend on Aftermath's routing service.** If it is down, a swap fails safely (nothing moves).
  Only SUI, WAL and DEEP are offered, with 1% maximum slippage.
- **Swap output goes to the owner's wallet, not back into the mandate.** Holding other coins in the
  mandate would need a price feed to apply dollar limits to them.

## Learning

- **The replay uses a scripted rater** ([ADR 0001](adr/0001-scripted-rater.md)), applied identically
  to both runs, because 100 runs cannot be rated consistently by hand. Live users rate by hand.
- **One replay run was aborted** midway and re-run; its partial data is kept in `docs/replay/` and
  excluded from the results.
- **Task types are few** (wallet risk, token holders, transfers, swaps), recognised by rules rather
  than by the model, which keeps money decisions deterministic but limits what can be asked.

## Operations

- **Free hosting tiers.** Render sleeps after inactivity; the first request after a deploy or idle
  period can take several seconds.
- **Report archives are capped** at 20 a day because each costs about 3,000 Tatum credits.
- **Welcome credits are capped** at 10 and are paid from a platform wallet that must be funded.
- **Earlier payments predate custody.** Payments made before the custody upgrade (6 November 2026)
  came from the agent's wallet with the spend recorded on the mandate afterwards; they show a
  separate "recorded" digest in [PROOF.md](PROOF.md).

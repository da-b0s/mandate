# Threat model

What MANDATE protects, who has which keys, and what each party could do. Written to be accurate,
not reassuring.

## Assets

- **The owner's USDC**, held in their mandate on Sui.
- **The rules** (limits, caps, expiry, check-in window), stored in the same mandate.
- **The owner's memory**: what they bought, rated and prefer.

## Who holds what

| Party | Holds | Can | Cannot |
| --- | --- | --- | --- |
| Owner | Their Google sign-in (zkLogin) or wallet key | Sign rules, approve caps, check in, revoke, withdraw everything | Be blocked from withdrawing: `withdraw` is not gated on anything but ownership |
| Agent key | Generated per user, **held by the MANDATE server**, encrypted at rest (AES-256-GCM) | Call `pay`, `begin_swap`/`finish_swap`, `deposit`, `record_spend` | Withdraw, change limits, revoke, or spend past any limit. Swap output can only go to the owner. |
| MANDATE server (operator) | All agent keys (decryptable with a server secret), the platform gas-sponsor key | Spend from a user's mandate **within that user's limits**, to any payee, by using the agent key | Exceed the limits, withdraw a user's funds to itself, or change a user's rules |
| Platform key | Sponsors gas, pays welcome credits | Pay gas and deposit credits | Touch any mandate's funds |
| Walrus Memory relayer | Sees memory contents in plaintext before they are encrypted and stored | Read what the agent remembers | |
| Vendors | Receive payments | Take payment and not deliver (the agent marks it refund-worthy and remembers) | Charge more than the quoted price: the agent checks the quote and the limits first |
| Tatum | Sees our RPC traffic | Observe reads and transactions, or fail | Change what the chain records; payments are checked against chain state |
| Aftermath | Routes swaps | Return a poor route within the 1% slippage bound, or fail | Redirect output: `finish_swap` sends it to the owner |

## The main risk and how it is bounded

**Agent keys are custodial.** Our server holds them so the agent can act without the owner signing
every purchase. If the server or its secret were compromised, an attacker could spend from each
mandate up to that mandate's weekly allowance, to a payee of their choice.

What bounds this:

- Funds sit in the mandate, not in the agent's wallet, so the attacker is limited by the contract's
  checks: weekly allowance, per-payment cap, per-service caps, expiry, revoke, check-in window.
- The owner can **revoke** and **withdraw everything** at any time, from their own sign-in.
- The **auto-freeze** stops spending if the owner stops checking in.
- Swaps cannot be used to extract funds to the attacker: output always goes to the owner.

Before custody (enforcement "level A"), payments came from the agent's own wallet and limits were
recorded after the fact; a leaked key could have drained the wallet. Custody ("level B") removed that.

## Other risks

| Risk | Mitigation |
| --- | --- |
| A vendor quotes more than expected | The agent compares the 402 quote with the catalogue price and the mandate's limits before paying. |
| A vendor takes payment and does not deliver | Marked refund-worthy and remembered; future value drops. The holders vendor checks Tatum has data before charging. |
| Replay of a payment proof | Vendors store used digests in Postgres, so a digest pays for one call, even across restarts. |
| Forged session | Sessions are HMAC-signed, httpOnly cookies issued only after verifying a signed sign-in message. |
| Someone points the agent at limits they control | A mandate is adopted only if it names this user as owner and this user's agent as agent. |
| Gas-sponsorship abuse | Per-owner and app-wide daily limits, plus a minimum sponsor balance. |
| Welcome-credit farming | Atomic claim, capped at 10 in total, paid only into a newly signed mandate. Credits can be withdrawn, so at most the credit pool is at risk. |
| Prompt injection into the answer model | The model only phrases facts it is given. It never sees keys and never decides what to pay. |

## Privacy

- Receipts of signed-in users are visible only to them; the Explorer lists their payments as
  "private" (the Sui transactions themselves are public, as all chain data is).
- Memory contents are visible to the Walrus Memory relayer in plaintext (see above).

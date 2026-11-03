# ADR 0001: Scripted rater for the learning replay

## Context
The replay (scripts/replay.js) runs the same 50 tasks with memory OFF and ON. Each paid
call needs a usefulness rating so the agent can learn, and so wasted spend can be measured.
A human cannot rate 100 runs consistently, and hand-picked ratings would bias the result.

## Decision
A deterministic rater, applied identically to both runs:

- A paid source is **useful** if it delivered (HTTP 200) and contributed at least one fact
  that no earlier-paid source in the same task had already given.
- It is **useless** if it delivered but added nothing new.
- It is **refund** if it was paid but did not deliver.

Facts per source: wallet-risk gives a flag verdict and holdings; holders gives a token
profile and flagged-holder count; the Premium Summariser gives only a flag verdict, which
the wallet risk report already provides.

## Consequences
- The Premium Summariser is rated useless whenever the wallet risk report was also bought.
  It is the declared low-value control vendor, so this is the intended signal.
- The rater knows nothing about memory; the ON run learns only from ratings it receives.
- Real users rate in the app; the replay rater only stands in for them in this experiment.

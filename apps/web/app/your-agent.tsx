"use client";
import { useEffect, useRef } from "react";
import { SignIn, useOwner } from "@/lib/owner";
import { useOwnerAction } from "@/lib/owner-action";
import { usdc } from "@/lib/format";
import { Icon } from "@/components/icons";
import { RulesForm } from "./rules-form";
import { CopyButton } from "@/components/copy-button";

/**
 * The whole setup in one place, in order: sign in -> set rules -> add money. Each step opens right
 * here (no page hopping), ticks itself off, and the guide disappears once the agent is ready.
 * The agent itself is created automatically right after sign-in.
 */
export function YourAgent() {
  const o = useOwner();
  const me = o.me;
  const { busy, result, act } = useOwnerAction();
  const creating = useRef(false);

  // Signed in but no agent yet: make one, no button needed.
  useEffect(() => {
    if (me?.owner && me.agent === null && !creating.current) {
      creating.current = true;
      fetch("/api/agent", { method: "POST" }).then(() => o.refreshMe());
    }
  }, [me?.owner, me?.agent]);

  if (!me) return <div className="card small muted" style={{ minHeight: 76 }}>Loading…</div>;

  const a = me.agent;
  const steps = [
    { title: "Sign in", done: Boolean(me.owner) },
    { title: "Set your agent's rules", done: Boolean(a?.grantId) },
    { title: "Add money", done: Boolean(a && a.usdc > 0) },
  ];
  const current = steps.findIndex((s) => !s.done);
  if (current === -1) return result?.credit ? <Bonus amount={result.credit} /> : null;

  return (
    <div className="card stack setup">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Set up your agent</h2>
        <span className="small muted">
          step {current + 1} of {steps.length} · free, gas is on us
        </span>
      </div>
      <ol className="checklist">
        {steps.map((s, i) => (
          <li key={s.title} className={s.done ? "done" : i === current ? "now" : ""}>
            <span className="tick">{s.done ? <Icon name="check" size={14} /> : i + 1}</span>
            <div className="stack" style={{ flex: 1 }}>
              <strong>{s.title}</strong>
              {i === current && body(i)}
            </div>
          </li>
        ))}
      </ol>
      {result && !result.ok && <div className="pill bad">{result.text}</div>}
      {result?.ok && result.credit ? <Bonus amount={result.credit} /> : null}
    </div>
  );

  function body(i: number) {
    if (i === 0)
      return (
        <>
          <span className="small muted">Google is easiest: no crypto wallet or app needed. Your sign-in becomes a Sui address only you control.</span>
          <SignIn />
        </>
      );
    if (i === 1)
      return a ? (
        <>
          <span className="small muted">
            These limits are stored in a smart contract. Your agent can never go past them, and only you can change them. The defaults are fine to start.
          </span>
          <RulesForm compact disabled={busy !== null} busy={busy === "create"} onCreate={(f) => act("create", { action: "create", ...f })} />
        </>
      ) : (
        <span className="small muted">Creating your agent…</span>
      );
    return (
      <>
        <span className="small muted">
          Your agent spends from its mandate, which is empty. Send a little USDC on Sui to the address below (0.50 is plenty to try everything). You can take
          it back any time in Settings.
        </span>
        <div className="row">
          <code style={{ wordBreak: "break-all" }}>{a!.address}</code>
          <CopyButton text={a!.address} label="Copy address" />
          <button onClick={() => o.refreshMe()}>I sent it, check again</button>
        </div>
        <span className="small muted">You can already chat: free checks, like spotting sanctioned wallets, need no money.</span>
      </>
    );
  }
}

function Bonus({ amount }: { amount: number }) {
  return (
    <div className="card bonus">
      <strong>Welcome bonus: {usdc(amount)} added to your mandate.</strong>
      <div className="small muted">Enough to try a few paid checks, a transfer and a swap. It follows the same rules as any money you add.</div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SignIn, useOwner } from "@/lib/owner";
import { short, suiscanObj, usdc } from "@/lib/format";

/**
 * Where the visitor stands, as one checklist: sign in -> create agent -> set rules -> add USDC -> ask.
 * Visitors who are not signed in see the demo notice instead. Once everything is done, a slim bar remains.
 */
export function YourAgent({ compact = false, onMandatePage = false }: { compact?: boolean; onMandatePage?: boolean }) {
  const o = useOwner();
  const me = o.me;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  // "Get your own agent" on the homepage links here with ?setup=1.
  useEffect(() => {
    if (new URLSearchParams(location.search).has("setup")) setOpen(true);
  }, []);

  if (!me) return <div className="card small muted" style={{ minHeight: 76 }}>Checking who you are…</div>;

  if (!me.owner && !open) {
    return (
      <div className="card demo-note">
        <div>
          <strong>You&apos;re trying the demo agent.</strong>{" "}
          <span className="muted">
            {onMandatePage ? "This page shows the demo agent's rules." : "Ask it anything below; it spends from our demo budget."} Want one that works for you?
          </span>
        </div>
        <button className="primary" onClick={() => setOpen(true)}>
          Set up my own agent
        </button>
      </div>
    );
  }

  const a = me.agent;
  const steps = [
    { title: "Sign in", done: Boolean(me.owner) },
    { title: "Create your agent", done: Boolean(a) },
    { title: "Set its rules", done: Boolean(a?.grantId) },
    { title: "Add USDC", done: Boolean(a && a.usdc > 0) },
    { title: "Ask it something", done: false },
  ];
  const current = steps.findIndex((s) => !s.done);
  const setupDone = current >= 4;

  if (setupDone) {
    return (
      <div className="card row small" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <strong>Your agent</strong>
          <a href={suiscanObj(a!.grantId!)} target="_blank" className="mono">
            mandate {short(a!.grantId!)}
          </a>
          <span className="pill ok">{usdc(a!.usdc)} available</span>
        </div>
        {!compact && <SignIn />}
      </div>
    );
  }

  return (
    <div className="card stack setup">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Set up your agent</h2>
        <span className="small muted">about 2 minutes · gas is on us</span>
      </div>
      <ol className="checklist">
        {steps.map((s, i) => (
          <li key={s.title} className={s.done ? "done" : i === current ? "now" : ""}>
            <span className="tick">{s.done ? "✓" : i + 1}</span>
            <div className="stack" style={{ flex: 1 }}>
              <strong>{s.title}</strong>
              {i === current && <StepBody i={i} />}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

  function StepBody({ i }: { i: number }) {
    if (i === 0)
      return (
        <>
          <span className="small muted">Google is easiest: no crypto wallet or app needed. Your sign-in becomes a Sui address only you control.</span>
          <SignIn />
        </>
      );
    if (i === 1)
      return (
        <>
          <span className="small muted">Your agent gets its own address. It can only ever spend inside the rules you set in the next step.</span>
          <div>
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await fetch("/api/agent", { method: "POST" });
                await o.refreshMe();
                setBusy(false);
              }}
            >
              {busy ? "Creating…" : "Create my agent"}
            </button>
          </div>
        </>
      );
    if (i === 2)
      return onMandatePage ? (
        <span className="small muted">Fill in the form below and press “Sign my rules”. You can change them later by signing new ones.</span>
      ) : (
        <>
          <span className="small muted">Choose a weekly allowance and a maximum per payment, then sign once.</span>
          <div>
            <Link href="/mandate#rules" className="btn primary">
              Set my rules →
            </Link>
          </div>
        </>
      );
    // i === 3: fund
    return (
      <>
        <span className="small muted">
          Send a little USDC on Sui to your agent&apos;s address (0.50 covers plenty of tasks). It moves into your mandate, where the rules apply, and you
          can withdraw it any time.
        </span>
        <div className="row">
          <code style={{ wordBreak: "break-all" }}>{a!.address}</code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(a!.address);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy address"}
          </button>
          <button onClick={() => o.refreshMe()}>I sent it, check again</button>
        </div>
        <span className="small muted">No USDC yet? Free checks, like spotting sanctioned wallets, already work.</span>
      </>
    );
  }
}

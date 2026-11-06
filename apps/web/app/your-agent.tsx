"use client";
import { useState } from "react";
import { SignIn, useOwner } from "@/lib/owner";
import { short, suiscanObj, usdc } from "@/lib/format";

/**
 * Where the visitor stands: watching the demo agent, or setting up / using their own.
 * Steps: sign in -> create your agent -> sign your mandate -> fund it with USDC.
 */
export function YourAgent({ compact = false }: { compact?: boolean }) {
  const o = useOwner();
  const me = o.me;
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!me) return null;
  if (!me.owner) {
    return (
      <div className="card stack small">
        <div>
          <strong>You are watching the demo agent.</strong>{" "}
          <span className="muted">Sign in to get your own agent, with your own limits, memory and receipts.</span>
        </div>
        <SignIn />
      </div>
    );
  }
  if (!me.agent) {
    return (
      <div className="card stack small">
        <div>
          <strong>Step 1 of 3: create your agent.</strong>{" "}
          <span className="muted">
            It gets its own Sui wallet. Its key stays encrypted on our server and can only spend inside the limits you sign next.
          </span>
        </div>
        <div className="row">
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
          <SignIn />
        </div>
      </div>
    );
  }
  const a = me.agent;
  if (!a.grantId) {
    return (
      <div className="card stack small">
        <div>
          <strong>Step 2 of 3: sign your mandate.</strong>{" "}
          <span className="muted">
            Choose a weekly budget, a per-purchase cap, an expiry and a heartbeat window below, then sign. You own the limits; your agent ({short(a.address)}) can
            never change them. Gas is on us.
          </span>
        </div>
        {!compact && <SignIn />}
      </div>
    );
  }
  const funded = a.usdc > 0;
  return (
    <div className="card stack small">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <strong>Your agent</strong>
          <a href={suiscanObj(a.grantId)} target="_blank" className="mono">
            mandate {short(a.grantId)}
          </a>
          <span className={`pill ${funded ? "ok" : "warn"}`}>{usdc(a.usdc)} available</span>
        </div>
        {!compact && <SignIn />}
      </div>
      {!funded && (
        <div className="stack">
          <span>
            <strong>Step 3 of 3: fund it.</strong> Send a little USDC on Sui (0.20 covers several tasks) to your agent&apos;s address. It moves
            into your mandate, where the contract enforces your limits and you can withdraw it at any time. Free checks (like sanctioned wallets) work without funds.
          </span>
          <div className="row">
            <code style={{ wordBreak: "break-all" }}>{a.address}</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(a.address);
                setCopied(true);
              }}
            >
              {copied ? "Copied" : "Copy address"}
            </button>
            <button onClick={() => o.refreshMe()}>Check balance</button>
          </div>
        </div>
      )}
    </div>
  );
}

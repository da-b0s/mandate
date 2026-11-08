"use client";
import { useEffect, useState } from "react";
import { suiscanObj, usdc } from "@/lib/format";

// Same layout while loading and loaded, so the page does not jump when the read finishes.
export function GrantBar({ refreshKey = 0, label = "Mandate" }: { refreshKey?: number; label?: string }) {
  const [g, setG] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/grant")
      .then((r) => r.json())
      .then((j) => (j.error ? setErr(j.error) : setG(j)))
      .catch((e) => setErr(String(e)));
  }, [refreshKey]);

  if (err) return <div className="card small"><span className="pill bad">Could not read the mandate from Sui</span> <span className="muted">{err}</span></div>;
  const pct = g ? Math.min(100, (g.spentThisWeek / g.weeklyBudget) * 100) : 0;
  const tone = g?.status === "active" ? "ok" : "bad";
  return (
    <div className="card stack small" aria-busy={!g}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <strong>{label}</strong>
          {g ? <span className={`pill ${tone}`}>{g.status}</span> : <span className="pill">reading Sui…</span>}
          {g && (
            <a href={suiscanObj(g.id)} target="_blank" className="mono">
              {g.id.slice(0, 10)}…
            </a>
          )}
        </div>
        <span className="muted">read live via Tatum gRPC</span>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: 6, background: "var(--accent)", borderRadius: 3, transition: "width .4s" }} />
      </div>
      <div className="row muted" style={{ justifyContent: "space-between" }}>
        <span>{g ? `${usdc(g.spentThisWeek)} of ${usdc(g.weeklyBudget)} spent this week` : "\u00a0"}</span>
        <span>{g ? `max ${usdc(g.perCallCap)} per call · ${g.payments} payments recorded` : "\u00a0"}</span>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span>
          <strong>{g ? usdc(g.held ?? 0) : "…"}</strong> held by the contract
        </span>
        <span className="muted">limits enforced onchain · only the owner can withdraw</span>
      </div>
    </div>
  );
}

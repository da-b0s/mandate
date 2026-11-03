"use client";
import { useEffect, useState } from "react";
import { suiscanObj, usdc } from "@/lib/format";

export function GrantBar({ refreshKey = 0 }: { refreshKey?: number }) {
  const [g, setG] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/grant")
      .then((r) => r.json())
      .then(setG)
      .catch((e) => setErr(String(e)));
  }, [refreshKey]);

  if (err) return <div className="pill bad">Could not read grant: {err}</div>;
  if (!g) return <div className="card small muted">Reading your grant from Sui mainnet…</div>;
  const pct = Math.min(100, (g.spentThisWeek / g.weeklyBudget) * 100);
  const tone = g.status === "active" ? "ok" : "bad";
  return (
    <div className="card stack small">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <strong>Grant</strong>
          <span className={`pill ${tone}`}>{g.status}</span>
          <a href={suiscanObj(g.id)} target="_blank" className="mono">
            {g.id.slice(0, 10)}…
          </a>
        </div>
        <span className="muted">read via Tatum gRPC</span>
      </div>
      <div style={{ height: 6, background: "var(--border)", borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: 6, background: "var(--accent)", borderRadius: 3 }} />
      </div>
      <div className="row muted" style={{ justifyContent: "space-between" }}>
        <span>
          {usdc(g.spentThisWeek)} of {usdc(g.weeklyBudget)} this week
        </span>
        <span>max {usdc(g.perCallCap)} per call · {g.payments} payments recorded</span>
      </div>
    </div>
  );
}

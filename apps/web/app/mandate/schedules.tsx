"use client";
import { useEffect, useState } from "react";
import { short, suiscanTx, usdc } from "@/lib/format";

const every = (ms: number) => {
  const units: [string, number][] = [["week", 604_800_000], ["day", 86_400_000], ["hour", 3_600_000], ["minute", 60_000]];
  const [name, size] = units.find(([, size]) => ms % size === 0) ?? ["minute", 60_000];
  const n = ms / size;
  return n === 1 ? `every ${name}` : `every ${n} ${name}s`;
};

// The user's recurring transfers. Each run is checked and recorded by the grant in one transaction.
export function Schedules() {
  const [list, setList] = useState<any[] | null>(null);
  const load = () => fetch("/api/schedules").then((r) => r.json()).then((j) => setList(j.schedules ?? []));
  useEffect(() => {
    load();
  }, []);
  if (!list || list.length === 0) return null;
  return (
    <div className="card stack">
      <h2>Recurring payments</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Each payment goes through your mandate on Sui. They stop by themselves if you revoke, the mandate expires, or you miss your heartbeat.
      </p>
      <div className="scroll-x">
        <table>
          <thead>
            <tr><th>To</th><th>Amount</th><th>How often</th><th>Next</th><th>Paid</th><th>Last result</th><th></th></tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td className="mono">{short(s.recipient, 10)}</td>
                <td>{usdc(s.amount)}</td>
                <td>{every(s.interval_ms)}</td>
                <td className="small">{s.active ? new Date(s.next_at).toLocaleString() : <span className="pill">stopped</span>}</td>
                <td>{s.runs}</td>
                <td className="small">
                  {s.last_error ? (
                    <span className="pill warn">{s.last_error}</span>
                  ) : s.last_digest ? (
                    <a href={suiscanTx(s.last_digest)} target="_blank" className="mono">{short(s.last_digest, 8)}</a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  {s.active && (
                    <button onClick={() => fetch(`/api/schedules/${s.id}/cancel`, { method: "POST" }).then(load)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

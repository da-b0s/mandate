"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { serviceName, usdc } from "@/lib/format";

export default function Dashboard() {
  const [v, setV] = useState<any>(null);
  const [compare, setCompare] = useState(true);
  const [allTasks, setAllTasks] = useState(false);
  useEffect(() => {
    fetch("/api/value").then((r) => r.json()).then(setV);
  }, []);
  if (!v) return <p className="muted">Reading receipts…</p>;

  const t = v.totals;
  const saved = t.memoryOnWouldHaveCost - t.memoryOnSpent;
  const savedPct = t.memoryOnWouldHaveCost ? Math.round((saved / t.memoryOnWouldHaveCost) * 100) : 0;

  return (
    <div className="stack">
      <div>
        <h1>Value: what the agent learned</h1>
        <p className="muted small" style={{ margin: 0 }}>
          Every number comes from receipts of real mainnet payments. &quot;Wasted&quot; means a paid call you later rated useless.
        </p>
      </div>

      <div className="grid">
        <Stat label="Tasks run" value={String(t.tasks)} />
        <Stat label="Total spent" value={usdc(t.spent)} />
        <Stat label="Wasted spend" value={usdc(t.wasted)} note={t.spent ? `${Math.round((t.wasted / t.spent) * 100)}% of spend` : undefined} />
        <Stat label="Saved by memory" value={usdc(saved)} note={`${savedPct}% less than paying every planned service`} />
      </div>

      <div className="card stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Cost per task</h2>
          <div className="row small">
            <span className="muted">Memory OFF cost</span>
            <div className="toggle">
              <button className={compare ? "on" : ""} onClick={() => setCompare(true)}>show</button>
              <button className={!compare ? "on" : ""} onClick={() => setCompare(false)}>hide</button>
            </div>
          </div>
        </div>
        <TaskChart tasks={v.tasks.slice(-CHART_TASKS)} compare={compare} />
        {v.tasks.length > CHART_TASKS && (
          <p className="small muted" style={{ margin: 0 }}>
            Latest {CHART_TASKS} of {v.tasks.length} tasks; totals above cover all of them.
          </p>
        )}
        <div className="row small muted">
          <Swatch color="var(--accent)" /> useful spend
          <Swatch color="var(--bad)" /> wasted spend
          {compare && (
            <>
              <Swatch outline /> what memory OFF would have paid
            </>
          )}
        </div>
      </div>

      <div className="card stack">
        <h2>Per service</h2>
        <div className="scroll-x">
          <table>
            <thead>
              <tr><th>Service</th><th>Price</th><th>Paid calls</th><th>Useful</th><th>Useless</th><th>Skipped by memory</th><th>Cost per useful answer</th></tr>
            </thead>
            <tbody>
              {v.services.map((s: any) => (
                <tr key={s.service}>
                  <td><strong>{serviceName(s.service)}</strong></td>
                  <td>{usdc(s.price)}</td>
                  <td>{s.calls}</td>
                  <td>{s.useful}</td>
                  <td>{s.useless}</td>
                  <td>{s.skipped}</td>
                  <td>{s.costPerUseful == null ? <span className="pill bad">never useful</span> : usdc(s.costPerUseful)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card stack">
        <h2>Tasks</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Click a task for its full receipt. &quot;Wasted&quot; is known once someone rates a paid task; tasks that bought nothing have nothing to rate.
        </p>
        <div className="scroll-x">
          <table>
            <thead>
              <tr><th>Task</th><th>Memory</th><th>Spent</th><th>Wasted</th><th>Skipped</th></tr>
            </thead>
            <tbody>
              {[...v.tasks].reverse().slice(0, allTasks ? undefined : TABLE_TASKS).map((x: any) => (
                <tr key={x.taskId}>
                  <td><Link href={`/receipts/${x.taskId}`} className="mono">{x.taskId}</Link></td>
                  <td>{x.useMemory ? "on" : "off"}</td>
                  <td>{usdc(x.spent)}</td>
                  <td>{!x.spent ? <span className="muted">—</span> : x.rated ? usdc(x.wasted) : <span className="muted">not rated</span>}</td>
                  <td>{x.skipped.map(serviceName).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {v.tasks.length > TABLE_TASKS && (
          <div>
            <button onClick={() => setAllTasks((x) => !x)}>{allTasks ? "Show latest 20" : `Show all ${v.tasks.length} tasks`}</button>
          </div>
        )}
      </div>
    </div>
  );
}

const TABLE_TASKS = 20;

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card stat">
      <div className="small muted">{label}</div>
      <div className="n">{value}</div>
      {note && <div className="small muted">{note}</div>}
    </div>
  );
}

function Swatch({ color, outline }: { color?: string; outline?: boolean }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 12,
        height: 12,
        borderRadius: 3,
        background: outline ? "transparent" : color,
        border: outline ? "1.5px dashed var(--muted)" : "none",
        marginLeft: 8,
      }}
    />
  );
}

// One bar per task, oldest left. Stacked useful + wasted spend; a dashed outline marks
// the memory-OFF counterfactual (every planned service paid).
const CHART_TASKS = 40;

function TaskChart({ tasks, compare }: { tasks: any[]; compare: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 160;
  const max = Math.max(1, ...tasks.map((t) => Math.max(t.spent, compare ? t.memoryOffCost : 0)));
  const y = (v: number) => (v / max) * H;
  if (tasks.length === 0) return <p className="muted small">No tasks yet.</p>;
  const h = hover == null ? null : tasks[hover];
  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: H, borderBottom: "1px solid var(--border)" }}>
        {tasks.map((t, i) => {
          const useful = t.spent - t.wasted;
          return (
            <div
              key={t.taskId}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ flex: 1, maxWidth: 36, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative", cursor: "default" }}
            >
              {compare && t.useMemory && t.memoryOffCost > t.spent && (
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: y(t.memoryOffCost), border: "1.5px dashed var(--muted)", borderBottom: 0, borderRadius: "4px 4px 0 0" }} />
              )}
              {t.wasted > 0 && <div style={{ height: y(t.wasted), background: "var(--bad)", borderRadius: "4px 4px 0 0", marginBottom: 2 }} />}
              <div style={{ height: y(useful), background: "var(--accent)", borderRadius: t.wasted > 0 ? 0 : "4px 4px 0 0", opacity: hover == null || hover === i ? 1 : 0.5 }} />
            </div>
          );
        })}
      </div>
      <div className="row small muted" style={{ justifyContent: "space-between", marginTop: 4 }}>
        <span>oldest</span>
        <span>{usdc(max)} max</span>
        <span>newest</span>
      </div>
      {h && (
        <div className="card small" style={{ position: "absolute", top: 0, right: 0, padding: 10, pointerEvents: "none" }}>
          <div className="mono">{h.taskId}</div>
          <div>memory {h.useMemory ? "on" : "off"} · spent {usdc(h.spent)}</div>
          <div>wasted {!h.spent ? "—" : h.rated ? usdc(h.wasted) : "not rated"}</div>
          {h.useMemory && <div>memory OFF would cost {usdc(h.memoryOffCost)}</div>}
          {h.skipped.length > 0 && <div>skipped: {h.skipped.map(serviceName).join(", ")}</div>}
        </div>
      )}
    </div>
  );
}

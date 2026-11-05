import Link from "next/link";
import { agent } from "@/lib/agent";
import { asSessionAgent } from "@/lib/session";
import { short, suiscanObj, suiscanTx, usdc, walruscan } from "@/lib/format";

export const dynamic = "force-dynamic";

const pct = (x: number) => `${Math.round(x * 100)}%`;

// One page of checkable evidence: onchain objects, every payment, every memory, the replay result.
export default async function ProofPage() {
  const a = await agent();
  const p = await asSessionAgent(() => a.proofData());
  const off = p.replay.filter((r: any) => r.mode === "off").at(-1);
  const on = p.replay.filter((r: any) => r.mode === "on").at(-1);
  const memTotal = Array.isArray(p.memories) ? p.memories.reduce((s: number, n: any) => s + n.memories, 0) : null;

  return (
    <div className="stack">
      <div>
        <h1>Proof</h1>
        <p className="muted small" style={{ margin: 0 }}>
          Everything below is on Sui mainnet or Walrus. Chain state is read live through Tatum gRPC; click any link to check it yourself.
        </p>
      </div>

      <div className="grid">
        <Stat label="Payments" value={String(p.payments.length)} note="real USDC on mainnet" />
        <Stat label="Memories on Walrus" value={memTotal == null ? "—" : String(memTotal)} note={`${Array.isArray(p.memories) ? p.memories.length : 0} namespaces`} />
        <Stat label="Grants" value={String(p.grants.length)} note="onchain spending limits" />
        <Stat label="Replay runs" value={String(p.replay.length)} note="50 fixed tasks each" />
      </div>

      {off && on && (
        <div className="card stack">
          <h2>Learning replay: same 50 tasks, memory OFF vs ON</h2>
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th></th><th>Memory OFF</th><th>Memory ON</th><th>Change</th></tr>
              </thead>
              <tbody>
                <Row label="Total spent" a={usdc(off.totals.spent)} b={usdc(on.totals.spent)} d={pct(on.totals.spent / off.totals.spent - 1)} />
                <Row label="Wasted spend" a={usdc(off.totals.wasted)} b={usdc(on.totals.wasted)} d={pct(on.totals.wasted / off.totals.wasted - 1)} />
                <Row label="Wasted share of spend" a={pct(off.totals.wastedRate)} b={pct(on.totals.wastedRate)} d="" />
                <Row label="Useful answers" a={String(off.totals.usefulAnswers)} b={String(on.totals.usefulAnswers)} d="" />
                <Row label="Cost per useful answer" a={usdc(off.totals.costPerUsefulAnswer)} b={usdc(on.totals.costPerUsefulAnswer)} d={pct(on.totals.costPerUsefulAnswer / off.totals.costPerUsefulAnswer - 1)} />
                <Row label="Paid calls" a={String(off.totals.payments)} b={String(on.totals.payments)} d="" />
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Method: scripts/replay.js runs scripts/tasks.json in a different order per run, real payments, ratings from a deterministic rater
            (docs/adr/0001-scripted-rater.md). The ON run starts with empty memory and learns during the run. Raw results: docs/replay/.
          </p>
        </div>
      )}

      {p.dormancy && (
        <div className="card stack">
          <h2>Dead man&apos;s switch, live on mainnet</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Grant <a href={suiscanObj(p.dormancy.grantId)} target="_blank" className="mono">{short(p.dormancy.grantId, 10)}</a> with a{" "}
            {p.dormancy.dormancyMs / 60000}-minute heartbeat window (scripts/dormancy-demo.js).
          </p>
          <div className="scroll-x">
            <table>
              <thead><tr><th>Time (UTC)</th><th>Event</th><th>Result</th></tr></thead>
              <tbody>
                {p.dormancy.log.map((e: any, i: number) => (
                  <tr key={i}>
                    <td className="mono">{e.at.slice(11, 19)}</td>
                    <td>{e.event.replaceAll("-", " ")}</td>
                    <td className="small">
                      {e.tx && <a href={suiscanTx(e.tx)} target="_blank" className="mono">{short(e.tx, 8)}</a>}
                      {e.paid?.map((d: string) => (
                        <span key={d}><span className="pill ok">paid</span> <a href={suiscanTx(d)} target="_blank" className="mono">{short(d, 8)}</a> </span>
                      ))}
                      {e.denied?.map((d: string) => <span key={d} className="pill bad">GRANT_DENIED: {d}</span>)}
                      {e.waitSeconds && <span className="muted">no heartbeat for {e.waitSeconds}s</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card stack">
        <h2>Onchain objects</h2>
        <div className="small">
          Package <code>mandate::grant</code>:{" "}
          <a href={suiscanObj(p.package.id)} target="_blank" className="mono">{short(p.package.id, 10)}</a> · published in{" "}
          <a href={suiscanTx(p.package.publishDigest)} target="_blank" className="mono">{short(p.package.publishDigest, 8)}</a>
        </div>
        <div className="scroll-x">
          <table>
            <thead>
              <tr><th>Grant</th><th>Weekly budget</th><th>Per call</th><th>Spent this week</th><th>Payments recorded</th><th>Total spent</th></tr>
            </thead>
            <tbody>
              {p.grants.map((g: any) => (
                <tr key={g.id}>
                  <td><a href={suiscanObj(g.id)} target="_blank" className="mono">{short(g.id, 10)}</a></td>
                  <td>{usdc(g.weeklyBudget)}</td>
                  <td>{usdc(g.perCallCap)}</td>
                  <td>{usdc(g.spentThisWeek)}</td>
                  <td>{g.payments}</td>
                  <td>{usdc(g.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card stack">
        <h2>Walrus Memory</h2>
        {Array.isArray(p.memories) ? (
          <table>
            <thead><tr><th>Namespace</th><th>Memories</th><th>Size</th></tr></thead>
            <tbody>
              {p.memories.map((n: any) => (
                <tr key={n.name}><td className="mono">{n.name}</td><td>{n.memories}</td><td>{(n.bytes / 1024).toFixed(1)} KB</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="pill bad">{p.memories.error}</div>
        )}
        {p.valueBlobs.length > 0 && (
          <div className="small">
            Latest value memories:{" "}
            {p.valueBlobs.slice(0, 6).map((b: any) => (
              <span key={b.valueBlob}>
                <a href={walruscan(b.valueBlob)} target="_blank" className="mono">{b.service} v{b.version}</a>{" "}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card stack">
        <h2>Every payment</h2>
        <div className="scroll-x">
          <table>
            <thead>
              <tr><th>Task</th><th>Service</th><th>Amount</th><th>Payment</th><th>Verified</th><th>Recorded on grant</th></tr>
            </thead>
            <tbody>
              {p.payments.map((x: any) => (
                <tr key={x.digest}>
                  <td><Link href={`/receipts/${x.taskId}`} className="mono">{x.taskId}</Link></td>
                  <td>{x.service}</td>
                  <td>{usdc(x.amount)}</td>
                  <td><a href={suiscanTx(x.digest)} target="_blank" className="mono">{short(x.digest, 8)}</a></td>
                  <td>{x.verifiedVia === "tatum-grpc" ? "Tatum ✓" : "—"}</td>
                  <td>{x.recordDigest ? <a href={suiscanTx(x.recordDigest)} target="_blank" className="mono">{short(x.recordDigest, 8)}</a> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small muted">Generated {p.generatedAt.replace("T", " ").slice(0, 19)} UTC</p>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card stat">
      <div className="small muted">{label}</div>
      <div className="n">{value}</div>
      {note && <div className="small muted">{note}</div>}
    </div>
  );
}

function Row({ label, a, b, d }: { label: string; a: string; b: string; d: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{a}</td>
      <td><strong>{b}</strong></td>
      <td>{d}</td>
    </tr>
  );
}

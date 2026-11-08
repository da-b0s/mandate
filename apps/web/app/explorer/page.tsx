import Link from "next/link";
import { agent } from "@/lib/agent";
import { serviceName, short, suiscanObj, suiscanTx, usdc, walruscan } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explorer" };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const LATEST = 10;

// The headline evidence up top; the full record (every payment, memory and test run) folded below.
export default async function ExplorerPage() {
  const a = await agent();
  // Not run as the signed-in user: the Explorer is the platform's public record.
  const p = await a.proofData();
  const off = p.replay.filter((r: any) => r.mode === "off").at(-1);
  const on = p.replay.filter((r: any) => r.mode === "on").at(-1);
  const memories = Array.isArray(p.memories) ? p.memories : [];
  const memTotal = memories.reduce((s: number, n: any) => s + n.memories, 0);
  const moved = p.payments.reduce((s: number, x: any) => s + (x.amount ?? 0), 0);
  const verified = p.payments.filter((x: any) => x.verifiedVia === "tatum-grpc").length;

  return (
    <div className="stack">
      <div>
        <h1>Explorer</h1>
        <p className="muted" style={{ margin: 0 }}>
          The record behind MANDATE. Every number links to Sui mainnet or Walrus, so you can check it yourself.
        </p>
      </div>

      <div className="grid">
        <Stat label="Payments on Sui mainnet" value={String(p.payments.length)} note={`${usdc(moved)} moved in total`} />
        <Stat label="Checked through Tatum" value={pct(p.payments.length ? verified / p.payments.length : 0)} note="each payment re-read and confirmed" />
        <Stat label="Memories on Walrus" value={String(memTotal)} note="ratings, receipts and preferences" />
        {off && on && <Stat label="Wasted spend once it learns" value={pct(on.totals.wasted / off.totals.wasted - 1)} note="same 50 tasks, memory on vs off" />}
      </div>

      {off && on && (
        <div className="card stack">
          <h2>Does the memory pay off? Same 50 tasks, memory off vs on</h2>
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th></th><th>Memory off</th><th>Memory on</th><th>Change</th></tr>
              </thead>
              <tbody>
                <Row label="Total spent" a={usdc(off.totals.spent)} b={usdc(on.totals.spent)} d={pct(on.totals.spent / off.totals.spent - 1)} />
                <Row label="Wasted on useless sources" a={usdc(off.totals.wasted)} b={usdc(on.totals.wasted)} d={pct(on.totals.wasted / off.totals.wasted - 1)} />
                <Row label="Cost per useful answer" a={usdc(off.totals.costPerUsefulAnswer)} b={usdc(on.totals.costPerUsefulAnswer)} d={pct(on.totals.costPerUsefulAnswer / off.totals.costPerUsefulAnswer - 1)} />
                <Row label="Useful answers" a={String(off.totals.usefulAnswers)} b={String(on.totals.usefulAnswers)} d="" />
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Real payments, run with scripts/replay.js. The memory-on run starts empty and learns as it goes. Raw results are in docs/replay/ in the repository.
          </p>
        </div>
      )}

      <div className="card stack">
        <h2>The contract that enforces the rules</h2>
        <p className="small muted" style={{ margin: 0 }}>
          <code>mandate::grant</code> on Sui mainnet holds each user&apos;s USDC and checks every payment, transfer and swap against their limits in the same
          transaction.
        </p>
        <div className="row small">
          <a href={suiscanObj(p.package.originalId)} target="_blank" className="btn">
            View the contract ↗
          </a>
          {p.package.upgradeDigest && (
            <a href={suiscanTx(p.package.upgradeDigest)} target="_blank" className="btn">
              Latest upgrade ↗
            </a>
          )}
        </div>
      </div>

      <div className="card stack">
        <h2>Latest payments</h2>
        <PaymentTable rows={p.payments.slice(0, LATEST)} />
      </div>

      <details className="card">
        <summary style={{ cursor: "pointer" }}>
          <strong>All evidence</strong> <span className="small muted">every payment, mandate, memory and the dead man&apos;s switch test</span>
        </summary>
        <div className="stack" style={{ marginTop: 16 }}>
          <h2>Mandates</h2>
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th>Mandate</th><th>Held</th><th>Weekly allowance</th><th>Per payment</th><th>Spent this week</th><th>Payments</th></tr>
              </thead>
              <tbody>
                {p.grants.map((g: any) => (
                  <tr key={g.id}>
                    <td><a href={suiscanObj(g.id)} target="_blank" className="mono">{short(g.id, 10)}</a></td>
                    <td>{usdc(g.held ?? 0)}</td>
                    <td>{usdc(g.weeklyBudget)}</td>
                    <td>{usdc(g.perCallCap)}</td>
                    <td>{usdc(g.spentThisWeek)}</td>
                    <td>{g.payments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {p.dormancy && (
            <>
              <h2>Dead man&apos;s switch, tested on mainnet</h2>
              <p className="small muted" style={{ margin: 0 }}>
                A mandate with a {p.dormancy.dormancyMs / 60000}-minute check-in window: paying, going quiet, being refused, checking in, paying again.
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
                          {e.denied?.map((d: string) => <span key={d} className="pill bad">refused: {d}</span>)}
                          {e.waitSeconds && <span className="muted">no check-in for {e.waitSeconds}s</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h2>Walrus Memory</h2>
          <div className="scroll-x">
            <table>
              <thead><tr><th>Namespace</th><th>Memories</th><th>Size</th></tr></thead>
              <tbody>
                {memories.map((n: any) => (
                  <tr key={n.name}><td className="mono">{n.name}</td><td>{n.memories}</td><td>{(n.bytes / 1024).toFixed(1)} KB</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {p.valueBlobs.length > 0 && (
            <div className="small">
              Latest learned values:{" "}
              {p.valueBlobs.slice(0, 6).map((b: any) => (
                <span key={b.valueBlob}>
                  <a href={walruscan(b.valueBlob)} target="_blank" className="mono">{serviceName(b.service)} v{b.version}</a>{" "}
                </span>
              ))}
            </div>
          )}

          <h2>Every payment ({p.payments.length})</h2>
          <PaymentTable rows={p.payments} />
        </div>
      </details>
      <p className="small faint">Read live through Tatum at {p.generatedAt.replace("T", " ").slice(0, 19)} UTC</p>
    </div>
  );
}

function PaymentTable({ rows }: { rows: any[] }) {
  return (
    <div className="scroll-x">
      <table>
        <thead>
          <tr><th>What</th><th>Amount</th><th>Transaction</th><th>Receipt</th></tr>
        </thead>
        <tbody>
          {rows.map((x: any) => (
            <tr key={x.digest}>
              <td>{serviceName(x.service)}</td>
              <td>{usdc(x.amount)}</td>
              <td><a href={suiscanTx(x.digest)} target="_blank" className="mono">{short(x.digest, 8)}</a></td>
              <td>{x.private ? <span className="small faint">private</span> : <Link href={`/receipts/${x.taskId}`} className="small">open</Link>}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

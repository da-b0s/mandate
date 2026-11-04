import Link from "next/link";
import { notFound } from "next/navigation";
import { agent } from "@/lib/agent";
import { short, suiscanObj, suiscanTx, usdc, walruscan } from "@/lib/format";

export const dynamic = "force-dynamic";

// The evidence chain for one task: what was asked, what the agent planned and why,
// which memories it used, every payment with its onchain proof, and the answer.
export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}$/.test(id)) notFound();
  const r = await (await agent()).loadReceipt(id);
  if (!r) notFound();

  return (
    <div className="stack">
      <div>
        <Link href="/" className="small">
          ← Agent
        </Link>
        <h1>Receipt {r.taskId}</h1>
        <div className="row small muted">
          <span>{r.steps?.[0]?.at?.replace("T", " ").slice(0, 19)} UTC</span>
          <span className={`pill ${r.useMemory ? "" : "warn"}`}>memory {r.useMemory ? "on" : "off"}</span>
          <span>
            grant{" "}
            <a href={suiscanObj(r.grantId)} target="_blank" className="mono">
              {short(r.grantId, 10)}
            </a>
          </span>
        </div>
      </div>

      <Section title="1. Asked">
        <p style={{ margin: 0 }}>{r.ask}</p>
        <p className="small muted" style={{ margin: 0 }}>
          Classified as <strong>{r.task.type}</strong> {r.task.subject && <code>{r.task.subject}</code>}
        </p>
      </Section>

      <Section title="2. Memories recalled before paying">
        {r.memoriesUsed.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            {r.useMemory ? "No value memories yet for these services." : "Memory was off: no recall."}
          </p>
        ) : (
          <table>
            <thead>
              <tr><th>Service</th><th>Observations</th><th>Walrus blob</th></tr>
            </thead>
            <tbody>
              {r.memoriesUsed.map((m: any) => (
                <tr key={m.blobId}>
                  <td>{m.service}</td>
                  <td>{m.observations}</td>
                  <td><a href={walruscan(m.blobId)} target="_blank" className="mono">{short(m.blobId, 10)}</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="3. Plan and decisions">
        <p className="small" style={{ margin: 0 }}>Plan: {r.plan.join(" → ")}</p>
        {r.skipped.map((s: any) => (
          <div key={s.service} className="pill warn">Skipped {s.service}: {s.reason} ({s.detail})</div>
        ))}
        {r.denied.map((s: any, i: number) => (
          <div key={i} className="pill bad">GRANT_DENIED: {s.reason} for {s.service} ({s.detail})</div>
        ))}
      </Section>

      <Section title="4. Payments">
        {r.payments.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>Nothing was paid.</p>
        ) : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th>Service</th><th>Amount</th><th>Payment tx</th><th>Verified</th><th>Recorded on grant</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {r.payments.map((p: any) => (
                  <tr key={p.digest}>
                    <td>{p.service}</td>
                    <td>{usdc(p.amount)}</td>
                    <td><a href={suiscanTx(p.digest)} target="_blank" className="mono">{short(p.digest, 8)}</a></td>
                    <td>{p.verifiedVia === "tatum-grpc" ? "Tatum gRPC ✓" : "—"}</td>
                    <td>{p.recordDigest ? <a href={suiscanTx(p.recordDigest)} target="_blank" className="mono">{short(p.recordDigest, 8)}</a> : "—"}</td>
                    <td>{r.ratings?.[p.service]?.rating ?? <span className="muted">unrated</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small" style={{ margin: 0 }}>Total: <strong>{usdc(r.totalSpent ?? 0)}</strong></p>
      </Section>

      <Section title="5. Answer">
        <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{r.answer}</p>
        <p className="small muted" style={{ margin: 0 }}>
          Output hash <code>{short(r.outputHash, 12)}</code>
          {r.answerModel ? ` · phrased by ${r.answerModel}` : ""}
        </p>
        {r.report?.blobId && (
          <p className="small" style={{ margin: 0 }}>
            Full report on Walrus (via Tatum Storage):{" "}
            <a href={walruscan(r.report.blobId)} target="_blank" className="mono">{short(r.report.blobId, 10)}</a>
          </p>
        )}
      </Section>

      {r.ratings && (
        <Section title="6. What the agent learned">
          {Object.entries(r.ratings).map(([svc, v]: any) => (
            <div key={svc} className="small">
              {svc}: <strong>{v.rating}</strong> → value memory v{v.version}{" "}
              <a href={walruscan(v.valueBlob)} target="_blank" className="mono">{short(v.valueBlob, 10)}</a>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card stack">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

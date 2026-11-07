"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { reason, serviceName, short, suiscanTx, usdc, walruscan } from "@/lib/format";
import { GrantBar } from "./grant-bar";
import { YourAgent } from "./your-agent";
import { useOwner } from "@/lib/owner";

type Step = { step: string; at?: string; [k: string]: any };
type Run = { ask: string; useMemory: boolean; steps: Step[]; receipt?: any; error?: string; ratings?: Record<string, any> };

// Ordered so the first one shows a real purchase; the last shows the free check saving money.
const EXAMPLES = [
  { tag: "pays a vendor", ask: "Who holds token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48? Any sanctioned holders?" },
  { tag: "memory decides", ask: "Brief me on the risks of wallet 0xf517db898c66fd87407bcb39f8644093628b01cea21afee3e9e4252a0d137a13" },
  { tag: "free check, no spend", ask: "Is wallet 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 safe to trade with?" },
];

export default function AgentPage() {
  const [ask, setAsk] = useState("");
  const [useMemory, setUseMemory] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [grantKey, setGrantKey] = useState(0);
  const owner = useOwner();

  async function submit(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setAsk("");
    const idx = runs.length;
    setRuns((r) => [...r, { ask: text, useMemory, steps: [] }]);
    const update = (f: (r: Run) => Run) => setRuns((rs) => rs.map((r, i) => (i === idx ? f(r) : r)));
    try {
      const res = await fetch("/api/tasks", { method: "POST", body: JSON.stringify({ ask: text, useMemory }) });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
      if (!res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const msg = JSON.parse(buf.slice(0, nl));
          buf = buf.slice(nl + 1);
          if (msg.step) update((r) => ({ ...r, steps: [...r.steps, msg.step] }));
          if (msg.receipt) update((r) => ({ ...r, receipt: msg.receipt }));
          if (msg.error) update((r) => ({ ...r, error: msg.error }));
        }
      }
    } catch (e) {
      update((r) => ({ ...r, error: String((e as Error).message) }));
    } finally {
      setBusy(false);
      setGrantKey((k) => k + 1);
      owner.refreshMe();
    }
  }

  return (
    <div className="stack">
      {runs.length === 0 && !owner.me?.agent && <Intro />}
      <div>
        <h1>Give the agent a task</h1>
        <p className="muted small" style={{ margin: 0 }}>
          It buys data with USDC on Sui, inside limits enforced by your onchain mandate, and remembers which services were worth it.
        </p>
      </div>
      <YourAgent compact />
      <GrantBar refreshKey={grantKey} />

      {runs.map((run, i) => (
        <RunView key={i} run={run} onRated={(ratings) => setRuns((rs) => rs.map((r, j) => (j === i ? { ...r, ratings } : r)))} />
      ))}

      <div className="card stack">
        <textarea
          value={ask}
          placeholder="e.g. Is wallet 0x… safe to trade with?"
          onChange={(e) => setAsk(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(ask);
            }
          }}
        />
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <span className="small muted">Memory</span>
            <div className="toggle">
              <button className={useMemory ? "on" : ""} onClick={() => setUseMemory(true)}>
                ON
              </button>
              <button className={!useMemory ? "on" : ""} onClick={() => setUseMemory(false)}>
                OFF
              </button>
            </div>
          </div>
          <button className="primary" disabled={busy || !ask.trim()} onClick={() => submit(ask)}>
            {busy ? "Working…" : "Run task"}
          </button>
        </div>
        {runs.length === 0 && owner.me?.agent?.grantId && (
          <p className="small muted" style={{ margin: 0 }}>
            Your agent can also send money inside your mandate: &quot;Send 0.01 USDC to 0x… every day&quot;.
          </p>
        )}
        {runs.length === 0 && (
          <div className="stack small">
            <span className="muted">Try one:</span>
            {EXAMPLES.map((e) => (
              <button key={e.ask} style={{ textAlign: "left" }} onClick={() => setAsk(e.ask)}>
                <span className="pill" style={{ marginRight: 8 }}>{e.tag}</span>
                {e.ask}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Intro() {
  return (
    <div className="card stack" style={{ background: "var(--accent-soft)", borderColor: "transparent" }}>
      <div>
        <h1 style={{ fontSize: 26 }}>A prepaid card for your AI agent</h1>
        <p className="muted" style={{ margin: 0 }}>
          Give an agent real money without giving it a blank cheque. It pays for data in USDC on Sui, only within limits you sign.
        </p>
      </div>
      <div className="grid">
        <div>
          <strong>🔒 Limits it can&apos;t override</strong>
          <div className="small muted">Your USDC sits in a Move contract that checks every payment: weekly budget, per-call cap, expiry, revoke.</div>
        </div>
        <div>
          <strong>🧠 A memory of what&apos;s worth buying</strong>
          <div className="small muted">Your ratings are stored on Walrus Memory, so it stops paying for sources that never help.</div>
        </div>
        <div>
          <strong>🧾 A receipt for every cent</strong>
          <div className="small muted">Every payment links to Sui mainnet, verified through Tatum. Try a task below, no sign-in needed.</div>
        </div>
      </div>
    </div>
  );
}

function Elapsed() {
  const [s, setS] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setS((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <>{s}s</>;
}

function RunView({ run, onRated }: { run: Run; onRated: (r: Record<string, any>) => void }) {
  const r = run.receipt;
  const free = r && !r.totalSpent && r.outputs?.["tatum-free"];
  return (
    <div className="card stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <strong>{run.ask}</strong>
        <span className={`pill ${run.useMemory ? "" : "warn"}`}>memory {run.useMemory ? "on" : "off"}</span>
      </div>
      <ul className="steps">
        {run.steps.map((s, i) => (
          <StepLine key={i} s={s} />
        ))}
        {!r && !run.error && (
          <li className="muted">
            <span className="icon">⏳</span>working… <Elapsed /> <span className="small">(paid tasks settle on Sui and usually take 10–20 s)</span>
          </li>
        )}
      </ul>
      {run.error && <div className="pill bad">{run.error}</div>}
      {r && (
        <>
          <div className="card" style={{ background: "var(--bg)" }}>
            <div style={{ whiteSpace: "pre-wrap" }}>{r.answer}</div>
            <div className="small muted" style={{ marginTop: 8 }}>
              {free
                ? "Answered from Tatum's free security check, so nothing was bought"
                : !r.totalSpent
                  ? "Nothing was bought for this answer"
                  : r.answerModel
                    ? `Written by ${r.answerModel} using only the sources paid for above`
                    : "Summary of the sources paid for above"}
            </div>
          </div>
          <div className="row small">
            <span className="pill ok">spent {usdc(r.totalSpent ?? 0)}</span>
            {r.skipped.length > 0 && <span className="pill warn">skipped {r.skipped.length}</span>}
            {r.denied.length > 0 && <span className="pill bad">denied {r.denied.length}</span>}
            {r.memoriesUsed.length > 0 && <span className="pill">recalled {r.memoriesUsed.length} memories</span>}
            <Link href={`/receipts/${r.taskId}`}>Full receipt →</Link>
          </div>
          {r.payments.length > 0 && <Rate taskId={r.taskId} payments={r.payments} rated={run.ratings} onRated={onRated} />}
        </>
      )}
    </div>
  );
}

function StepLine({ s }: { s: Step }) {
  const svc = s.service ? <strong>{serviceName(s.service)}</strong> : null;
  const line = (icon: string, body: React.ReactNode, tone?: string) => (
    <li style={tone ? { color: `var(--${tone})` } : undefined}>
      <span className="icon">{icon}</span>
      <span>{body}</span>
    </li>
  );
  switch (s.step) {
    case "classified":
      return line("🔎", <>Task: {({ "wallet-risk": "wallet risk check", "token-holders": "token holder check", transfer: "transfer", unknown: "not recognised" } as any)[s.type] ?? s.type} {s.subject && <code>{short(s.subject, 10)}</code>}</>);
    case "free-read":
      return line("🆓", <>Free check first ({s.source}): {s.flagged ? <strong>flagged by {s.list}</strong> : "not flagged"}</>, s.flagged ? "bad" : undefined);
    case "transfer":
      return line("📤", <>Send {usdc(s.amount)} to <code>{short(s.recipient, 10)}</code>{s.intervalMs ? " (recurring)" : ""}</>);
    case "sent":
      return line("💸", <>Sent, and recorded on your mandate in the same transaction: <a href={suiscanTx(s.digest)} target="_blank">{short(s.digest, 8)}</a></>, "ok");
    case "scheduled":
      return line("🔁", <>Scheduled {s.every}; next payment {new Date(s.nextAt).toLocaleString()}</>);
    case "planned":
      return line("🗺", <>Plan: {s.plan.map(serviceName).join(" → ") || "nothing to buy"}</>);
    case "skipped":
      return line("⏭", <>Skipped {svc}: {reason(s.reason)} <span className="muted">({s.detail})</span></>, "warn");
    case "denied":
      return line("⛔", <>Your mandate refused {svc}: {reason(s.reason)} <span className="muted">({s.detail})</span></>, "bad");
    case "buying":
      return line("🛒", <>Buying {svc} for {usdc(s.price)}</>);
    case "quote":
      return line("🧾", <>Quote from {svc}: {usdc(s.amount)} to <code>{short(s.recipient)}</code></>);
    case "grant-ok":
      return line("✅", <>Mandate allows it: {usdc(s.spentThisWeek)} of {usdc(s.weeklyBudget)} spent this week <span className="muted">(read via Tatum)</span></>);
    case "paid":
      return line("💸", <>Paid {svc} from the mandate; the contract checked the limits in the same transaction: <a href={suiscanTx(s.digest)} target="_blank">{short(s.digest, 8)}</a></>);
    case "verified":
      return line("🛡", <>Payment verified through Tatum gRPC</>, "ok");
    case "recorded":
      return line("⛓", <>Spend recorded on the grant: <a href={suiscanTx(s.digest)} target="_blank">{short(s.digest, 8)}</a></>);
    case "delivery-failed":
      return s.refundWorthy
        ? line("⚠", <>{svc} took payment but did not deliver (HTTP {s.status}); marked refund-worthy and remembered</>, "bad")
        : line("ℹ", <>{svc} could not serve this request, so nothing was charged <span className="muted">({s.status})</span></>, "warn");
    case "archived":
      return line("🗄", <>Full report archived on Walrus via Tatum Storage: <a href={walruscan(s.blobId)} target="_blank">{short(s.blobId, 8)}</a></>);
    case "record-failed":
      return line("⚠", <>Paid, but recording on the grant failed; queued for retry</>, "warn");
    case "answering":
      return line("✍", <>Writing the answer</>);
    case "done":
      return line("🏁", <>Done</>);
    default:
      return null;
  }
}

function Rate({ taskId, payments, rated, onRated }: { taskId: string; payments: any[]; rated?: Record<string, any>; onRated: (r: Record<string, any>) => void }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => setChoice(Object.fromEntries(payments.map((p) => [p.service, "useful"]))), [payments]);

  if (rated) {
    return (
      <div className="row small">
        <span className="muted">Learned (stored on Walrus in the background):</span>
        {Object.entries(rated).map(([svc, v]: any) => (
          <span key={svc} className={`pill ${v.rating === "useful" ? "ok" : "bad"}`}>
            {serviceName(svc)}: {v.rating}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="stack small" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
      <span className="muted">Was each paid source worth it? The agent will remember.</span>
      {payments.map((p) => (
        <div key={p.service} className="row">
          <span style={{ minWidth: 160 }}>{serviceName(p.service)}</span>
          <div className="toggle">
            {["useful", "useless"].map((v) => (
              <button key={v} className={choice[p.service] === v ? "on" : ""} onClick={() => setChoice((c) => ({ ...c, [p.service]: v }))}>
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div>
        <button
          className="primary"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const res = await fetch(`/api/tasks/${taskId}/rating`, { method: "POST", body: JSON.stringify({ ratings: choice }) });
            const j = await res.json();
            setSaving(false);
            if (j.ratings) onRated(j.ratings);
          }}
        >
          {saving ? "Saving…" : "Save rating"}
        </button>
      </div>
    </div>
  );
}

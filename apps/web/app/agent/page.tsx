"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { reason, serviceName, short, suiscanTx, usdc, walruscan } from "@/lib/format";
import { YourAgent } from "../your-agent";
import { useOwner } from "@/lib/owner";

type Step = { step: string; at?: string; [k: string]: any };
type Run = { ask: string; useMemory: boolean; steps: Step[]; receipt?: any; error?: string; ratings?: Record<string, any> };

// Money-moving examples, shown once the visitor has their own funded mandate (they go to the owner).
const OWNER_EXAMPLES = [
  { title: "Swap 0.05 USDC to SUI", note: "coins go to your wallet", ask: "Swap 0.05 USDC to SUI" },
  { title: "Buy WAL every week", note: "a recurring swap", ask: "Buy 0.05 USDC of WAL every week" },
];

// Ordered so the first one shows a real purchase; the last shows the free check saving money.
const EXAMPLES = [
  { title: "Check a token's holders", note: "pays a data service 0.03 USDC", ask: "Who holds token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48? Any sanctioned holders?" },
  { title: "Is this wallet safe?", note: "a free check answers it, nothing spent", ask: "Is wallet 0x098B716B8Aaf21512996dC57EB0615e2383E2f96 safe to trade with?" },
  { title: "Brief me on a wallet", note: "memory decides what's worth buying", ask: "Brief me on the risks of wallet 0xf517db898c66fd87407bcb39f8644093628b01cea21afee3e9e4252a0d137a13" },
  { title: "Send money", note: "with your own agent", ask: "Send 0.01 USDC to 0x0520a2fd4beef5fac411f9b8290bd090d36444f01bb8cc8a8fad9bbc1e5ce9fa" },
];

export default function AgentPage() {
  const [ask, setAsk] = useState("");
  const [useMemory, setUseMemory] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [busy, setBusy] = useState(false);
  const [grantKey, setGrantKey] = useState(0);
  const owner = useOwner();
  const endRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const mine = Boolean(owner.me?.agent?.grantId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [runs]);

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

  const examples = [...OWNER_EXAMPLES, ...EXAMPLES.slice(0, 2)];
  const ready = mine;

  return (
    <div className="chat-page">
      <div className="chat-top">
        {ready ? <MandateChip refreshKey={grantKey} mine={mine} /> : <span className="small muted">Set up your agent to start chatting</span>}
        <div className="row small">
          <span className="muted" title="ON: it uses what it learned to skip sources that weren't worth it. OFF: it pays for everything it planned, so you can compare.">
            Memory
          </span>
          <div className="toggle">
            <button className={useMemory ? "on" : ""} onClick={() => setUseMemory(true)}>On</button>
            <button className={!useMemory ? "on" : ""} onClick={() => setUseMemory(false)}>Off</button>
          </div>
        </div>
      </div>

      <div className="thread">
        {runs.length === 0 ? (
          <div className="empty">
            <span className="logo" />
            <h1>{ready ? "What should your agent do?" : "Meet your agent"}</h1>
            <p className="muted" style={{ margin: 0, maxWidth: 520 }}>
              It checks wallets and tokens, sends money and swaps coins, always inside the rules of its mandate. Every payment gets a receipt.
            </p>
            <div style={{ width: "100%", marginTop: 22, textAlign: "left" }}>
              <YourAgent />
            </div>
            {ready && <div className="suggest">
              {examples.map((e) => (
                <button
                  key={e.ask}
                  onClick={() => {
                    setAsk(e.ask);
                    boxRef.current?.focus();
                  }}
                >
                  {e.title}
                  <span>{e.note}</span>
                </button>
              ))}
            </div>}
          </div>
        ) : (
          runs.map((run, i) => (
            <Exchange key={i} run={run} onRated={(ratings) => setRuns((rs) => rs.map((r, j) => (j === i ? { ...r, ratings } : r)))} />
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="composer">
        <textarea
          ref={boxRef}
          rows={1}
          value={ask}
          disabled={!ready}
          placeholder={ready ? "Message your agent… e.g. swap 0.05 USDC to SUI" : "Finish the setup above to start chatting"}
          onChange={(e) => {
            setAsk(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(ask);
            }
          }}
        />
        <div className="bar">
          <span className="small faint">{busy ? "Working on it…" : "Enter to send · Shift+Enter for a new line"}</span>
          <button className="primary send" aria-label="Send" disabled={!ready || busy || !ask.trim()} onClick={() => submit(ask)}>
            ↑
          </button>
        </div>
      </div>
      <div className="hint">Real USDC on Sui mainnet. The agent can only spend inside its mandate.</div>
    </div>
  );
}

/** One line at the top: whose mandate, what it holds, how much is left this week. Links to Settings. */
function MandateChip({ refreshKey, mine }: { refreshKey: number; mine: boolean }) {
  const [g, setG] = useState<any>(null);
  useEffect(() => {
    fetch("/api/grant").then((r) => r.json()).then((j) => !j.error && setG(j)).catch(() => {});
  }, [refreshKey]);
  return (
    <Link href="/mandate" className="status-chip" title="Open settings">
      <span className={`dot ${g && g.status !== "active" ? "off" : ""}`} />
      <span>{mine ? "Your agent" : "Demo agent"}</span>
      {g ? (
        <>
          <span>·</span>
          <span>
            <b>{usdc(g.held ?? 0)}</b> held
          </span>
          <span>·</span>
          <span>
            <b>{usdc(Math.max(0, g.weeklyBudget - g.spentThisWeek))}</b> left this week
          </span>
        </>
      ) : (
        <span>· reading Sui…</span>
      )}
      <span>Settings</span>
    </Link>
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

/** A user message and the agent's reply: the answer first, what it did folded underneath. */
function Exchange({ run, onRated }: { run: Run; onRated: (r: Record<string, any>) => void }) {
  const r = run.receipt;
  const free = r && !r.totalSpent && r.outputs?.["tatum-free"];
  const working = !r && !run.error;
  const lines = run.steps.filter((s) => s.step !== "done");
  return (
    <>
      <div className="msg-me">{run.ask}</div>
      <div className="msg-ai">
        <span className="avatar">
          <span className="logo" />
        </span>
        <div className="ai-body">
          {working && (
            <div className="live">
              <span className="spinner" />
              <span>
                {lines.length ? <StepText s={lines[lines.length - 1]} /> : "Thinking…"} · <Elapsed />
              </span>
            </div>
          )}
          {run.error && <div className="pill bad">{run.error}</div>}
          {r && (
            <>
              <div className="answer">{r.answer}</div>
              {r.denied.some((d: any) => d.reason === "funds") && (
                <div className="card notice">
                  <strong>Your mandate has no money yet, so I couldn&apos;t buy anything.</strong>
                  <div className="small muted">Paid checks, transfers and swaps are paid from your mandate. Add a little USDC and ask again.</div>
                  <Link href="/mandate#money" className="btn primary" style={{ marginTop: 10 }}>
                    Add money
                  </Link>
                </div>
              )}
              <div className="row small meta">
                <span className={`pill ${r.totalSpent ? "" : "ok"}`}>{r.totalSpent ? `spent ${usdc(r.totalSpent)}` : "spent nothing"}</span>
                {r.skipped.length > 0 && <span className="pill warn">skipped {r.skipped.length}</span>}
                {r.denied.length > 0 && <span className="pill bad">refused {r.denied.length}</span>}
                {r.memoriesUsed.length > 0 && <span className="pill">used {r.memoriesUsed.length} {r.memoriesUsed.length === 1 ? "memory" : "memories"}</span>}
                {!run.useMemory && <span className="pill warn">memory off</span>}
                <Link href={`/receipts/${r.taskId}`} className="small">
                  Receipt ↗
                </Link>
              </div>
              <div className="small faint" style={{ marginTop: 6 }}>
                {free
                  ? "Answered from Tatum's free security check, so nothing was bought."
                  : !r.totalSpent
                    ? "Nothing was bought for this answer."
                    : r.answerModel
                      ? `Written by ${r.answerModel} using only the sources paid for.`
                      : "Summary of the sources paid for."}
              </div>
            </>
          )}
          {lines.length > 0 && (
            <details className="trace" open={working}>
              <summary>What I did · {lines.length} steps</summary>
              <ul className="steps">
                {lines.map((s, i) => (
                  <StepLine key={i} s={s} />
                ))}
              </ul>
            </details>
          )}
          {r && r.payments.length > 0 && r.payments.some((p: any) => !["transfer", "swap"].includes(p.service)) && (
            <Rate taskId={r.taskId} payments={r.payments.filter((p: any) => !["transfer", "swap"].includes(p.service))} rated={run.ratings} onRated={onRated} />
          )}
        </div>
      </div>
    </>
  );
}

/** The latest step as a short live status. */
function StepText({ s }: { s: Step }) {
  const svc = s.service ? serviceName(s.service) : "";
  const t: Record<string, string> = {
    classified: "Understanding the request",
    "free-read": "Running a free check first",
    preferences: "Reading your preferences",
    planned: "Planning what to buy",
    buying: `Buying ${svc}`,
    quote: `Got a price from ${svc}`,
    "grant-ok": "Mandate allows it",
    paid: "Paid, confirming on Sui",
    verified: "Payment verified",
    swap: "Preparing the swap",
    "swap-quote": "Found the best price",
    swapped: "Swapped, verifying",
    transfer: "Preparing the transfer",
    sent: "Sent, verifying",
    answering: "Writing the answer",
    archived: "Saving the report",
    skipped: `Skipped ${svc}`,
    denied: "Mandate refused a payment",
  };
  return <>{t[s.step] ?? "Working"}</>;
}

function StepLine({ s }: { s: Step }) {
  const svc = s.service ? <strong>{serviceName(s.service)}</strong> : null;
  // The icon argument is kept for readability of the cases below but no longer drawn: a dot carries the tone.
  const line = (_icon: string, body: React.ReactNode, tone?: string) => (
    <li style={tone ? { color: `var(--${tone})` } : undefined}>
      <span className={`sdot ${tone ?? ""}`} />
      <span>{body}</span>
    </li>
  );
  switch (s.step) {
    case "classified":
      return line("", <>Task: {({ "wallet-risk": "wallet risk check", "token-holders": "token holder check", transfer: "transfer", swap: "swap", unknown: "not recognised" } as any)[s.type] ?? s.type} {s.subject && <code>{short(s.subject, 10)}</code>}</>);
    case "free-read":
      return line("", <>Free check first ({s.source}): {s.flagged ? <strong>flagged by {s.list}</strong> : "not flagged"}</>, s.flagged ? "bad" : undefined);
    case "transfer":
      return line("", <>Send {usdc(s.amount)} to <code>{short(s.recipient, 10)}</code>{s.intervalMs ? " (recurring)" : ""}</>);
    case "sent":
      return line("", <>Sent, and recorded on your mandate in the same transaction: <a href={suiscanTx(s.digest)} target="_blank">{short(s.digest, 8)}</a></>, "ok");
    case "swap":
      return line("", <>Swap {usdc(s.amount)} into {s.symbol}, delivered to your wallet</>);
    case "swap-quote":
      return line("", <>Best route via Aftermath: about {(Number(s.expected) / 10 ** (s.symbol === "DEEP" ? 6 : 9)).toFixed(4)} {s.symbol} <span className="muted">(max 1% slippage)</span></>);
    case "swapped":
      return line("", <>Swapped from the mandate; limits checked and coins sent to the owner in one transaction: <a href={suiscanTx(s.digest)} target="_blank">{short(s.digest, 8)}</a></>, "ok");
    case "scheduled":
      return line("", <>Scheduled {s.every}; next payment {new Date(s.nextAt).toLocaleString()}</>);
    case "planned":
      return line("", <>Plan: {s.plan.map(serviceName).join(" → ") || "nothing to buy"}</>);
    case "skipped":
      return line("", <>Skipped {svc}: {reason(s.reason)} <span className="muted">({s.detail})</span></>, "warn");
    case "denied":
      return line("", <>Your mandate refused {svc}: {reason(s.reason)} <span className="muted">({s.detail})</span></>, "bad");
    case "buying":
      return line("", <>Buying {svc} for {usdc(s.price)}</>);
    case "quote":
      return line("", <>Quote from {svc}: {usdc(s.amount)} to <code>{short(s.recipient)}</code></>);
    case "grant-ok":
      return line("", <>Mandate allows it: {usdc(s.spentThisWeek)} of {usdc(s.weeklyBudget)} spent this week <span className="muted">(read via Tatum)</span></>);
    case "paid":
      return line("", <>Paid {svc} from the mandate; the contract checked the limits in the same transaction: <a href={suiscanTx(s.digest)} target="_blank">{short(s.digest, 8)}</a></>);
    case "verified":
      return line("", <>Payment verified through Tatum gRPC</>, "ok");
    case "recorded":
      return line("", <>Spend recorded on the grant: <a href={suiscanTx(s.digest)} target="_blank">{short(s.digest, 8)}</a></>);
    case "delivery-failed":
      return s.refundWorthy
        ? line("", <>{svc} took payment but did not deliver (HTTP {s.status}); marked refund-worthy and remembered</>, "bad")
        : line("", <>{svc} could not serve this request, so nothing was charged <span className="muted">({s.status})</span></>, "warn");
    case "archived":
      return line("", <>Full report archived on Walrus via Tatum Storage: <a href={walruscan(s.blobId)} target="_blank">{short(s.blobId, 8)}</a></>);
    case "record-failed":
      return line("", <>Paid, but recording on the grant failed; queued for retry</>, "warn");
    case "answering":
      return line("", <>Writing the answer</>);
    case "done":
      return line("", <>Done</>);
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
    <div className="stack small card" style={{ marginTop: 12, padding: 14 }}>
      <span className="muted">Was each paid source worth it? Your agent will remember next time.</span>
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

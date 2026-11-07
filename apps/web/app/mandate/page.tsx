"use client";
import { useOwner } from "@/lib/owner";
import { useEffect, useState } from "react";
import { short, suiscanTx, TASK_TYPES, usdc, walruscan } from "@/lib/format";
import { GrantBar } from "../grant-bar";
import { YourAgent } from "../your-agent";
import { Schedules } from "./schedules";

type Result = { ok: boolean; text: string; digest?: string; memoryBlob?: string };

// The owner's console: the agent proposes, the owner decides, the chain enforces.
export default function MandatePage() {
  const owner = useOwner();
  const account = owner.address ? { address: owner.address } : null;
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch("/api/proposals").then((r) => r.json()).then(setData);
  }, [refresh]);

  const isOwner = account && data && account.address === data.owner;
  // Signed in with an agent but no mandate yet: they may create their first one.
  const needsMandate = Boolean(owner.me?.agent && !owner.me.agent.grantId);

  async function act(key: string, body: Record<string, unknown>) {
    if (!account) return;
    setBusy(key);
    setResult(null);
    try {
      const built = await fetch("/api/owner/build", { method: "POST", body: JSON.stringify({ ...body, sender: account.address }) }).then((r) => r.json());
      if (built.error) throw new Error(built.error);
      const signature = await owner.signTransaction(built.bytes);
      const sent = await fetch("/api/owner/submit", { method: "POST", body: JSON.stringify({ bytes: built.bytes, signature, action: body.action }) }).then((r) => r.json());
      if (sent.error) throw new Error(sent.error);
      setResult({ ok: true, text: ({ create: "Rules signed. Your agent now follows them.", cap: "Change approved on Sui.", heartbeat: "Checked in. The auto-freeze timer restarted.", revoke: "Mandate stopped for good.", withdraw: "Your USDC is on its way to your wallet." } as Record<string, string>)[String(body.action)] ?? "Confirmed on Sui", digest: sent.digest, memoryBlob: sent.ratification?.memoryBlob });
      setRefresh((n) => n + 1);
      await owner.refreshMe();
    } catch (e) {
      setResult({ ok: false, text: String((e as Error).message ?? e) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1>Your mandate</h1>
        <p className="muted" style={{ margin: 0 }}>
          The rulebook your agent can&apos;t break, kept in a smart contract on Sui. Here you set the rules, see what the agent suggests changing, and pause it
          or take your money back.
        </p>
      </div>
      <GrantBar refreshKey={refresh} label={owner.me?.agent?.grantId ? "Your mandate" : "Demo agent's mandate"} />

      <YourAgent onMandatePage />
      {account && data && !isOwner && !owner.me?.agent && (
        <div className="card small">
          <span className="pill warn">
            Signed in as {short(account.address)}. This page shows the demo mandate, owned by {short(data.owner)}; create your own agent above.
          </span>
        </div>
      )}

      {result && (
        <div className={`card small ${result.ok ? "" : ""}`}>
          <span className={`pill ${result.ok ? "ok" : "bad"}`}>{result.ok ? "Done" : "Failed"}</span> {result.text}
          {result.digest && (
            <>
              {" "}· tx <a href={suiscanTx(result.digest)} target="_blank" className="mono">{short(result.digest, 8)}</a>
            </>
          )}
          {result.memoryBlob && (
            <>
              {" "}· policy memory <a href={walruscan(result.memoryBlob)} target="_blank" className="mono">{short(result.memoryBlob, 8)}</a>
            </>
          )}
        </div>
      )}

      <div className="card stack">
        <h2>What the agent suggests</h2>
        <p className="small muted" style={{ margin: 0 }}>
          From your ratings, the agent works out which services are worth paying for. It can only suggest; nothing changes until the owner signs.
        </p>
        {!data ? (
          <p className="muted small">Reading learned value from Walrus Memory…</p>
        ) : (
          <div className="scroll-x">
            <table>
              <thead>
                <tr><th>Service</th><th>Paid calls rated</th><th>Usefulness</th><th>Current cap</th><th>Proposal</th><th></th></tr>
              </thead>
              <tbody>
                {data.rows.map((r: any) => (
                  <tr key={r.service + r.taskType}>
                    <td>
                      <strong>{r.name}</strong>
                      <div className="small muted">{TASK_TYPES[r.taskType] ?? r.taskType}</div>
                    </td>
                    <td>
                      {r.observations}
                      {r.memoryBlob && (
                        <div className="small"><a href={walruscan(r.memoryBlob)} target="_blank" className="mono">memory</a></div>
                      )}
                    </td>
                    <td>{r.observations ? `${Math.round(r.pUseful * 100)}%` : "—"}</td>
                    <td>{r.currentCap === 0 ? <span className="pill bad">blocked</span> : usdc(r.currentCap)}</td>
                    <td className="small">
                      {r.proposal ? (
                        <>
                          <strong>{r.proposal.proposedCap === 0 ? "Block" : `Cap at ${usdc(r.proposal.proposedCap)}`}</strong>
                          <div className="muted">{r.proposal.reason}</div>
                        </>
                      ) : (
                        <span className="muted">{r.observations < 3 ? "needs 3+ rated calls" : "no change"}</span>
                      )}
                    </td>
                    <td>
                      {!isOwner && (r.proposal || r.currentCap === 0) ? (
                        <span className="small muted" title="Limits change only when the mandate's owner signs.">owner signs to approve</span>
                      ) : r.proposal ? (
                        <button className="primary" disabled={!isOwner || busy !== null} onClick={() => act(r.service, { action: "cap", payee: r.payee, cap: r.proposal.proposedCap })}>
                          {busy === r.service ? "Signing…" : "Approve"}
                        </button>
                      ) : r.currentCap === 0 ? (
                        <button disabled={!isOwner || busy !== null} onClick={() => act(r.service, { action: "cap", payee: r.payee, cap: data.perCallCap })}>
                          {busy === r.service ? "Signing…" : "Unblock"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {owner.me?.agent?.grantId && <Schedules />}

      {/* Owner-only controls: visitors see what the agent learned above, not buttons they cannot use. */}
      {isOwner && <Preferences isOwner />}

      {(isOwner || needsMandate) && (
        <CreateMandate disabled={busy !== null} busy={busy === "create"} onCreate={(f) => act("create", { action: "create", ...f })} />
      )}

      {isOwner && (
        <div className="card stack">
          <h2>Pause, stop or take your money back</h2>
          <p className="small muted" style={{ margin: 0 }}>
            <strong>Check in</strong> now and then: if you go quiet for longer than your auto-freeze window, the agent stops spending until you check in again.{" "}
            <strong>Stop for good</strong> revokes the mandate forever. <strong>Withdraw</strong> sends every USDC left in it to your wallet, any time, even
            after stopping.
          </p>
          <div className="row">
            <button className="primary" disabled={busy !== null} onClick={() => act("heartbeat", { action: "heartbeat" })}>
              {busy === "heartbeat" ? "Signing…" : "Check in"}
            </button>
            <button
              disabled={busy !== null}
              onClick={() => {
                if (confirm("Stop this mandate for good? The agent can never spend under it again. You can still withdraw what's left. This cannot be undone.")) act("revoke", { action: "revoke" });
              }}
            >
              {busy === "revoke" ? "Signing…" : "Stop for good"}
            </button>
            <button
              disabled={busy !== null}
              onClick={() => {
                if (confirm("Withdraw all USDC from this mandate to your wallet? The agent cannot spend until you fund it again.")) act("withdraw", { action: "withdraw" });
              }}
            >
              {busy === "withdraw" ? "Signing…" : "Withdraw all USDC"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

type MandateForm = { weeklyUsdc: string; perCallUsdc: string; days: string; heartbeatHours: string };

// Blueprint 3.2: the owner sets the limits; the agent is named in the grant but cannot change them.
function CreateMandate({ disabled, busy, onCreate }: { disabled: boolean; busy: boolean; onCreate: (f: MandateForm) => void }) {
  const [f, setF] = useState<MandateForm>({ weeklyUsdc: "2", perCallUsdc: "0.10", days: "30", heartbeatHours: "168" });
  const field = (k: keyof MandateForm, label: string, hint: string) => (
    <label className="stack small" style={{ gap: 4 }}>
      <span>{label}</span>
      <input
        value={f[k]}
        inputMode="decimal"
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        style={{ font: "inherit", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
      />
      <span className="muted">{hint}</span>
    </label>
  );
  return (
    <div className="card stack" id="rules">
      <h2>Set your agent&apos;s rules</h2>
      <p className="small muted" style={{ margin: 0 }}>
        You sign these once; the agent can never change them. Signing new rules later replaces the old ones (their history stays on Sui). Gas is on us.
      </p>
      <div className="grid">
        {field("weeklyUsdc", "Weekly allowance (USDC)", "the most it can spend in any 7 days")}
        {field("perCallUsdc", "Maximum per payment (USDC)", "for any one purchase, transfer or swap")}
        {field("days", "Valid for (days)", "after this, every payment is refused")}
        {field("heartbeatHours", "Auto-freeze after (hours)", "if you don't check in for this long")}
      </div>
      <div>
        <button className="primary" disabled={disabled} onClick={() => onCreate(f)}>
          {busy ? "Signing…" : "Sign my rules"}
        </button>
      </div>
    </div>
  );
}

// Blueprint 8.5 mandate-prefs: free text -> Walrus Memory analyze() -> facts the agent recalls before paying.
function Preferences({ isOwner }: { isOwner: boolean }) {
  const owner = useOwner();
  const [prefs, setPrefs] = useState<any[] | null>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const load = () => fetch("/api/prefs").then((r) => r.json()).then((j) => setPrefs(j.prefs ?? []));
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setStatus("Waiting for your wallet…");
    try {
      const signature = await owner.signMessage(new TextEncoder().encode(`MANDATE preference:
${text.trim()}`));
      setStatus("Extracting facts with Walrus Memory…");
      const j = await fetch("/api/prefs", { method: "POST", body: JSON.stringify({ text: text.trim(), signature }) }).then((r) => r.json());
      if (j.error) throw new Error(j.error);
      setStatus(`Saved: ${j.facts.map((f: any) => f.text).join(" · ")}`);
      setText("");
      load();
    } catch (e) {
      setStatus(String((e as Error).message ?? e));
    }
  }

  return (
    <div className="card stack">
      <h2>Your preferences</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Tell the agent what not to buy, or a price it should not exceed. Walrus Memory turns it into facts the agent recalls before every payment.
        Preferences can only make it spend less; the grant stays the hard limit.
      </p>
      {prefs === null ? (
        <p className="small muted">Recalling…</p>
      ) : prefs.length === 0 ? (
        <p className="small muted">No preferences yet.</p>
      ) : (
        <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
          {prefs.map((p: any, i: number) => (
            <li key={i}>
              {p.text}{" "}
              {p.blobId ? <a href={walruscan(p.blobId)} target="_blank" className="mono">memory</a> : <span className="muted">(indexing)</span>}
            </li>
          ))}
        </ul>
      )}
      <textarea value={text} placeholder="e.g. Never pay more than 0.03 USDC for a single call" onChange={(e) => setText(e.target.value)} />
      <div className="row">
        <button className="primary" disabled={!isOwner || text.trim().length < 5} onClick={save}>
          Save preference
        </button>
        {status && <span className="small muted">{status}</span>}
      </div>
    </div>
  );
}

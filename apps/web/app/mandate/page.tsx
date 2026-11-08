"use client";
import { useOwner } from "@/lib/owner";
import { useOwnerAction } from "@/lib/owner-action";
import { RulesForm } from "../rules-form";
import { useEffect, useState } from "react";
import { short, suiscanTx, TASK_TYPES, usdc, walruscan } from "@/lib/format";
import { GrantBar } from "../grant-bar";
import { YourAgent } from "../your-agent";
import { Schedules } from "./schedules";

// The owner's console: the agent proposes, the owner decides, the chain enforces.
export default function MandatePage() {
  const owner = useOwner();
  const account = owner.address ? { address: owner.address } : null;
  const [data, setData] = useState<any>(null);
  const [refresh, setRefresh] = useState(0);
  const { busy, result, act } = useOwnerAction(() => setRefresh((n) => n + 1));

  useEffect(() => {
    fetch("/api/proposals").then((r) => r.json()).then(setData);
  }, [refresh]);

  const isOwner = account && data && account.address === data.owner;
  // Signed in with an agent but no mandate yet: they may create their first one.
  const needsMandate = Boolean(owner.me?.agent && !owner.me.agent.grantId);

  const agentAddress = owner.me?.agent?.address;
  const hasOwn = Boolean(owner.me?.agent?.grantId);

  return (
    <div className="settings">
      <nav className="snav">
        <a href="#money">Money</a>
        <a href="#rules">Rules</a>
        <a href="#safety">Pause &amp; stop</a>
        <a href="#recurring">Recurring</a>
        <a href="#learning">What it learned</a>
        <a href="/agent" style={{ marginTop: 12 }}>← Back to chat</a>
      </nav>
      <div>
        <h1>Settings</h1>
        <p className="muted" style={{ marginTop: 0 }}>
          Your agent&apos;s money and rules. Every change here is signed by you and enforced by the contract on Sui.
        </p>
        <YourAgent />
        {hasOwn && (<>
        {result && (
          <div className="card small" style={{ marginTop: 12 }}>
            <span className={`pill ${result.ok ? "ok" : "bad"}`}>{result.ok ? "Done" : "Failed"}</span> {result.text}
            {result.digest && (
              <>
                {" "}· <a href={suiscanTx(result.digest)} target="_blank" className="mono">{short(result.digest, 8)}</a>
              </>
            )}
            {result.memoryBlob && (
              <>
                {" "}· memory <a href={walruscan(result.memoryBlob)} target="_blank" className="mono">{short(result.memoryBlob, 8)}</a>
              </>
            )}
          </div>
        )}

        <Section id="money" title="Money">
          <GrantBar refreshKey={refresh} label="Your mandate" />
          {isOwner && (
            <div className="card stack" style={{ marginTop: 12 }}>
              <div>
                <strong>Add money</strong>
                <div className="small muted">Send USDC on Sui to your agent&apos;s address. It moves into the mandate at the next payment.</div>
              </div>
              {agentAddress && (
                <div className="row">
                  <code style={{ wordBreak: "break-all" }}>{agentAddress}</code>
                  <button onClick={() => navigator.clipboard.writeText(agentAddress)}>Copy</button>
                </div>
              )}
              <div className="row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div>
                  <strong>Take money back</strong>
                  <div className="small muted">Sends every USDC left in the mandate to your wallet. Works any time, even after stopping.</div>
                </div>
                <button
                  disabled={busy !== null}
                  onClick={() => {
                    if (confirm("Withdraw all USDC from this mandate to your wallet? The agent cannot spend until you add money again.")) act("withdraw", { action: "withdraw" });
                  }}
                >
                  {busy === "withdraw" ? "Signing…" : "Withdraw all"}
                </button>
              </div>
            </div>
          )}
        </Section>

        <Section id="rules" title="Rules">
          <RulesForm disabled={busy !== null} busy={busy === "create"} onCreate={(f) => act("create", { action: "create", ...f })} />
        </Section>

        <Section id="safety" title="Pause & stop">
          {isOwner ? (
            <div className="card stack">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div>
                  <strong>Check in</strong>
                  <div className="small muted">Resets the auto-freeze timer. If you go quiet for longer than your window, the agent stops spending until you check in.</div>
                </div>
                <button className="primary" disabled={busy !== null} onClick={() => act("heartbeat", { action: "heartbeat" })}>
                  {busy === "heartbeat" ? "Signing…" : "Check in"}
                </button>
              </div>
              <div className="row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div>
                  <strong>Stop for good</strong>
                  <div className="small muted">Revokes the mandate forever. You can still withdraw what&apos;s left.</div>
                </div>
                <button
                  disabled={busy !== null}
                  onClick={() => {
                    if (confirm("Stop this mandate for good? The agent can never spend under it again. You can still withdraw what's left. This cannot be undone.")) act("revoke", { action: "revoke" });
                  }}
                  style={{ color: "var(--bad)" }}
                >
                  {busy === "revoke" ? "Signing…" : "Stop for good"}
                </button>
              </div>
            </div>
          ) : (
            <div className="card small muted">The owner can check in, stop the agent for good, or withdraw at any time.</div>
          )}
        </Section>

        <Section id="recurring" title="Recurring payments & swaps">
          {owner.me?.agent?.grantId ? (
            <Schedules />
          ) : (
            <div className="card small muted">Ask your agent things like “send 5 USDC to 0x… every week” or “swap 1 USDC to SUI every Friday”. They show up here.</div>
          )}
        </Section>

        <Section id="learning" title="What it learned">
          {isOwner && <Preferences isOwner />}
          <div className="card stack" style={{ marginTop: isOwner ? 12 : 0 }}>
            <h2>Services it suggests changing</h2>
            <p className="small muted" style={{ margin: 0 }}>
              From your ratings, the agent works out which services are worth paying for. It can only suggest; nothing changes until the owner approves.
            </p>
            {!data ? (
              <p className="muted small">Reading what it learned from Walrus Memory…</p>
            ) : (
              <div className="scroll-x">
                <table>
                  <thead>
                    <tr><th>Service</th><th>Rated calls</th><th>Useful</th><th>Limit</th><th>Suggestion</th><th></th></tr>
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
                              <strong>{r.proposal.proposedCap === 0 ? "Block it" : `Limit to ${usdc(r.proposal.proposedCap)}`}</strong>
                              <div className="muted">{r.proposal.reason}</div>
                            </>
                          ) : (
                            <span className="muted">{r.observations < 3 ? "needs 3+ ratings" : "no change"}</span>
                          )}
                        </td>
                        <td>
                          {!isOwner && (r.proposal || r.currentCap === 0) ? (
                            <span className="small muted">owner approves</span>
                          ) : r.proposal ? (
                            <button className="primary" disabled={busy !== null} onClick={() => act(r.service, { action: "cap", payee: r.payee, cap: r.proposal.proposedCap })}>
                              {busy === r.service ? "Signing…" : "Approve"}
                            </button>
                          ) : r.currentCap === 0 ? (
                            <button disabled={busy !== null} onClick={() => act(r.service, { action: "cap", payee: r.payee, cap: data.perCallCap })}>
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
        </Section>
        </>)}
      </div>
    </div>
  );
}

// Module level, so re-rendering the page never remounts the forms inside a section.
function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="section-title" id={id}>{title}</div>
      {children}
    </>
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

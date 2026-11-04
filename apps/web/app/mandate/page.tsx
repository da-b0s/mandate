"use client";
import { ConnectButton, useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { short, suiscanTx, usdc, walruscan } from "@/lib/format";
import { GrantBar } from "../grant-bar";

type Result = { ok: boolean; text: string; digest?: string; memoryBlob?: string };

// The owner's console: the agent proposes, the owner decides, the chain enforces.
export default function MandatePage() {
  const account = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    fetch("/api/proposals").then((r) => r.json()).then(setData);
  }, [refresh]);

  const isOwner = account && data && account.address === data.owner;

  async function act(key: string, body: Record<string, unknown>) {
    if (!account) return;
    setBusy(key);
    setResult(null);
    try {
      const built = await fetch("/api/owner/build", { method: "POST", body: JSON.stringify({ ...body, sender: account.address }) }).then((r) => r.json());
      if (built.error) throw new Error(built.error);
      const { signature } = await signTransaction({ transaction: built.bytes, chain: "sui:mainnet" });
      const sent = await fetch("/api/owner/submit", { method: "POST", body: JSON.stringify({ bytes: built.bytes, signature, action: body.action }) }).then((r) => r.json());
      if (sent.error) throw new Error(sent.error);
      setResult({ ok: true, text: `${body.action} confirmed onchain`, digest: sent.digest, memoryBlob: sent.ratification?.memoryBlob });
      setRefresh((n) => n + 1);
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
        <p className="muted small" style={{ margin: 0 }}>
          The agent can only propose. Limits change when the owner signs, and the Move contract enforces them on Sui.
        </p>
      </div>
      <GrantBar refreshKey={refresh} />

      <div className="card row" style={{ justifyContent: "space-between" }}>
        <div className="small">
          {!account && <span className="muted">Connect the owner wallet to approve changes.</span>}
          {account && isOwner && <span className="pill ok">Connected as owner</span>}
          {account && data && !isOwner && (
            <span className="pill warn">
              Connected wallet {short(account.address)} is not the owner ({short(data.owner)}). You can look, but not sign.
            </span>
          )}
        </div>
        <ConnectButton />
      </div>

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
        <h2>What the agent proposes</h2>
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
                      <div className="small muted">{r.taskType}</div>
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
                      {r.proposal ? (
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

      <CreateMandate disabled={!isOwner || busy !== null} busy={busy === "create"} onCreate={(f) => act("create", { action: "create", ...f })} />

      <div className="card stack">
        <h2>Dead man&apos;s switch</h2>
        <p className="small muted" style={{ margin: 0 }}>
          If the owner stops sending heartbeats, the grant goes dormant and every payment is refused with GRANT_DENIED: dormant. A heartbeat revives it.
        </p>
        <div className="row">
          <button className="primary" disabled={!isOwner || busy !== null} onClick={() => act("heartbeat", { action: "heartbeat" })}>
            {busy === "heartbeat" ? "Signing…" : "Send heartbeat"}
          </button>
          <button
            disabled={!isOwner || busy !== null}
            onClick={() => {
              if (confirm("Revoke this grant? The agent can never spend under it again. This cannot be undone.")) act("revoke", { action: "revoke" });
            }}
          >
            {busy === "revoke" ? "Signing…" : "Revoke grant"}
          </button>
        </div>
      </div>
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
    <div className="card stack">
      <h2>New mandate</h2>
      <p className="small muted" style={{ margin: 0 }}>
        Creates a fresh grant on Sui, signed by you, and the agent switches to it. The old grant keeps its history.
      </p>
      <div className="grid">
        {field("weeklyUsdc", "Weekly budget (USDC)", "most it can spend in 7 days")}
        {field("perCallUsdc", "Per-call cap (USDC)", "most for any one purchase")}
        {field("days", "Expires in (days)", "then every payment is refused")}
        {field("heartbeatHours", "Heartbeat window (hours)", "freezes if you go quiet this long")}
      </div>
      <div>
        <button className="primary" disabled={disabled} onClick={() => onCreate(f)}>
          {busy ? "Signing…" : "Create mandate"}
        </button>
      </div>
    </div>
  );
}

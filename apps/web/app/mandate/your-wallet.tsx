"use client";
import { useEffect, useState } from "react";
import { CopyButton } from "@/components/copy-button";

type Bal = { symbol: string; decimals: number; balance: string };
// Exact amount for Max (never rounded up past the balance).
const exact = (b: Bal) => {
  const s = b.balance.padStart(b.decimals + 1, "0");
  const frac = s.slice(-b.decimals).replace(/0+$/, "");
  return s.slice(0, -b.decimals) + (frac ? "." + frac : "");
};
const fmt = (b: Bal) => (Number(b.balance) / 10 ** b.decimals).toFixed(b.decimals === 9 ? 4 : 2);

/**
 * The owner's own wallet: coins from swaps and withdrawals land here. Google users have no other
 * app for this address, so they send from here. The owner signs; the agent is not involved.
 */
export function YourWallet({ act, busy, refresh }: { act: (k: string, b: Record<string, unknown>) => Promise<void>; busy: string | null; refresh: number }) {
  const [w, setW] = useState<{ address: string; balances: Bal[] } | null>(null);
  const [symbol, setSymbol] = useState("SUI");
  const [amount, setAmount] = useState("");
  const [to, setTo] = useState("");
  const load = () => fetch("/api/wallet").then((r) => r.json()).then((j) => !j.error && setW(j));
  useEffect(() => {
    load();
  }, [refresh]);

  const held = w?.balances.find((b) => b.symbol === symbol);
  return (
    <div className="card stack">
      <div>
        <strong>Your wallet</strong>
        <div className="small muted">
          Your own address, separate from the mandate. Coins from swaps and withdrawals arrive here. Only you can move them; your agent can&apos;t.
        </div>
      </div>
      {w && (
        <div className="row">
          <code className="small" style={{ wordBreak: "break-all" }}>{w.address}</code>
          <CopyButton text={w.address} />
        </div>
      )}
      <div className="money">
        {(w?.balances ?? []).map((b) => (
          <div key={b.symbol}>
            <span className="small muted">{b.symbol}</span>
            <b>{fmt(b)}</b>
          </div>
        ))}
        {!w && <span className="small muted">Reading your balances…</span>}
      </div>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }} className="stack">
        <strong>Send</strong>
        <div className="formgrid">
          <label className="field">
            <span>Coin</span>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
              {(w?.balances ?? []).map((b) => (
                <option key={b.symbol} value={b.symbol}>{b.symbol}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Amount</span>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input value={amount} inputMode="decimal" placeholder="0.00" onChange={(e) => setAmount(e.target.value)} />
              {held && <button type="button" onClick={() => setAmount(exact(held))}>Max</button>}
            </div>
          </label>
        </div>
        <label className="field">
          <span>To (Sui address)</span>
          <input value={to} placeholder="0x…" onChange={(e) => setTo(e.target.value.trim())} />
        </label>
        <div className="row">
          <button
            className="primary"
            disabled={busy !== null || !amount || !to}
            onClick={async () => {
              await act("send", { action: "send", symbol, amount, to });
              setAmount("");
              load();
            }}
          >
            {busy === "send" ? "Signing…" : `Send ${symbol}`}
          </button>
          <span className="small muted">You sign it; gas is on us.</span>
        </div>
      </div>
    </div>
  );
}

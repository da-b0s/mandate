"use client";
import { useState } from "react";

export type MandateForm = { weeklyUsdc: string; perCallUsdc: string; days: string; heartbeatHours: string };

// Blueprint 3.2: the owner sets the limits; the agent is named in the grant but cannot change them.
export function RulesForm({ disabled, busy, onCreate, compact = false }: { disabled: boolean; busy: boolean; onCreate: (f: MandateForm) => void; compact?: boolean }) {
  const [f, setF] = useState<MandateForm>({ weeklyUsdc: "2", perCallUsdc: "0.10", days: "30", heartbeatHours: "168" });
  const field = (k: keyof MandateForm, label: string, hint: string) => (
    <label className="field">
      <span>{label}</span>
      <input value={f[k]} inputMode="decimal" onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      <span className="hint2">{hint}</span>
    </label>
  );
  return (
    <div className={compact ? "stack" : "card stack"}>
      {!compact && (
        <>
          <h2>Change your agent&apos;s rules</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Signing new rules replaces the old ones (their history stays on Sui). Money still in the old mandate stays withdrawable. Gas is on us.
          </p>
        </>
      )}
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


// Shown instantly while the Proof page gathers chain, Walrus and receipt data.
export default function Loading() {
  return (
    <div className="stack">
      <div>
        <h1>Receipt</h1>
        <p className="muted small" style={{ margin: 0 }}>Loading the evidence chain…</p>
      </div>
      <div className="grid">
        {["Asked", "Memories", "Payments", "Answer"].map((l) => (
          <div key={l} className="card stat">
            <div className="small muted">{l}</div>
            <div className="n muted">…</div>
          </div>
        ))}
      </div>
    </div>
  );
}

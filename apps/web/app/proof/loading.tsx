// Shown instantly while the Proof page gathers chain, Walrus and receipt data.
export default function Loading() {
  return (
    <div className="stack">
      <div>
        <h1>Proof</h1>
        <p className="muted small" style={{ margin: 0 }}>Reading Sui mainnet through Tatum and counting memories on Walrus…</p>
      </div>
      <div className="grid">
        {["Payments", "Memories on Walrus", "Grants", "Replay runs"].map((l) => (
          <div key={l} className="card stat">
            <div className="small muted">{l}</div>
            <div className="n muted">…</div>
          </div>
        ))}
      </div>
    </div>
  );
}

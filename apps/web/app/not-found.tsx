import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="card stack" style={{ textAlign: "center", padding: 40 }}>
      <h1>Nothing here</h1>
      <p className="muted" style={{ margin: 0 }}>That page does not exist. Receipts and links on this site point to real pages; this one may be mistyped.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link href="/">Give the agent a task</Link>·<Link href="/proof">See the proof</Link>
      </div>
    </div>
  );
}

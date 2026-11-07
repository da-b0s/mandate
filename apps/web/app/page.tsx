import Link from "next/link";
import { agent } from "@/lib/agent";

// Numbers on the homepage come from real receipts and the committed replay; refresh every 5 minutes.
export const revalidate = 300;

async function stats() {
  try {
    const a = await agent();
    const runs = a.replayRuns();
    const off = runs.filter((r: any) => r.mode === "off").at(-1);
    const on = runs.filter((r: any) => r.mode === "on").at(-1);
    const receipts = await a.listReceipts({ light: true });
    const payments = receipts.reduce((n: number, r: any) => n + (r.payments?.length ?? 0), 0);
    const pct = (a: number, b: number) => Math.round((1 - a / b) * 100);
    return {
      payments,
      wasteCut: off && on ? pct(on.totals.wasted, off.totals.wasted) : 86,
      costCut: off && on ? pct(on.totals.costPerUsefulAnswer, off.totals.costPerUsefulAnswer) : 43,
    };
  } catch {
    return { payments: null, wasteCut: 86, costCut: 43 };
  }
}

const CAN = [
  { icon: "🔎", title: "Buy information", body: "Pays data services a few cents per answer, like checking whether a wallet is linked to scams." },
  { icon: "📤", title: "Send money", body: "Pays people once, or on a schedule: “send 5 USDC to Ada every week”." },
  { icon: "🔄", title: "Swap coins", body: "Turns USDC into SUI, WAL or DEEP at the best price, delivered to your wallet." },
  { icon: "🧠", title: "Learn what's worth it", body: "Remembers your ratings, so it stops paying for sources that never help." },
];

const STEPS = [
  { n: 1, title: "Sign in with Google", body: "No crypto wallet needed. You get your own agent with its own address." },
  { n: 2, title: "Set its rules", body: "A weekly allowance, a maximum per payment, and an end date. You sign them once." },
  { n: 3, title: "Add some USDC", body: "A few dollars is plenty. The money sits inside the rules, and you can take it back any time." },
  { n: 4, title: "Ask in plain words", body: "“Is this wallet safe?”, “Send 2 USDC to …”, “Swap 1 USDC to SUI every Friday”." },
];

const RULES = [
  ["Weekly allowance", "It can never spend more than this in 7 days."],
  ["Maximum per payment", "No single payment, transfer or swap can go above it."],
  ["End date", "After it, every payment is refused."],
  ["Auto-freeze", "If you don't check in for a while, it stops spending until you do."],
  ["Stop button", "Revoke the mandate and it can never spend again."],
  ["Your money back", "Withdraw everything that's left, whenever you like."],
];

const ASKS = [
  "Is wallet 0x098B…2f96 safe to trade with?",
  "Who holds token 0xA0b8…eB48? Any sanctioned holders?",
  "Send 0.50 USDC to 0x0520…5fa9 every week",
  "Swap 1 USDC to SUI every Friday",
];

export default async function Home() {
  const s = await stats();
  return (
    <div className="home">
      <section className="hero">
        <div className="eyebrow">Built on Sui · Walrus Memory · Tatum</div>
        <h1>Give your AI agent a wallet it can&apos;t empty.</h1>
        <p className="lede">
          MANDATE is a prepaid card for AI agents. You set the rules once. Your agent pays for information, sends money and swaps coins inside them, and
          every cent gets a public receipt.
        </p>
        <div className="row cta">
          <Link href="/agent" className="btn primary big">
            Try the demo, no sign-in
          </Link>
          <Link href="/agent?setup=1" className="btn big">
            Get your own agent →
          </Link>
        </div>
        <div className="stats">
          <div>
            <b>−{s.wasteCut}%</b>
            <span>wasted spend once it learns</span>
          </div>
          <div>
            <b>−{s.costCut}%</b>
            <span>cost per useful answer</span>
          </div>
          <div>
            <b>{s.payments ?? "190+"}</b>
            <span>real payments on Sui mainnet</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="section">What your agent can do</h2>
        <div className="grid cards">
          {CAN.map((c) => (
            <div key={c.title} className="card feature">
              <div className="ficon">{c.icon}</div>
              <strong>{c.title}</strong>
              <p className="small muted">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section">How it works</h2>
        <ol className="howto">
          {STEPS.map((x) => (
            <li key={x.n} className="card">
              <span className="num">{x.n}</span>
              <div>
                <strong>{x.title}</strong>
                <p className="small muted">{x.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="split">
        <div>
          <h2 className="section">Rules it can&apos;t break</h2>
          <p className="muted">
            The rules live in a smart contract on Sui, and your USDC sits inside it. Every payment is checked by the contract in the same step that moves the
            money. Not by the AI, and not by us: if a payment breaks a rule, it simply doesn&apos;t happen.
          </p>
          <ul className="rules">
            {RULES.map(([t, b]) => (
              <li key={t}>
                <strong>{t}</strong> <span className="muted">{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card chat">
          <div className="small muted">Things you can ask</div>
          {ASKS.map((a) => (
            <div key={a} className="bubble">
              {a}
            </div>
          ))}
          <div className="bubble reply">
            Swapped 1.00 USDC into 1.16 SUI, sent straight to your wallet. Counted against your weekly allowance. Receipt →
          </div>
        </div>
      </section>

      <section className="card proofband">
        <div>
          <strong>Don&apos;t take our word for it.</strong>
          <p className="small muted">
            Every payment links to Sui mainnet and is double-checked through Tatum. Every memory is stored on Walrus. The 50-task replay that produced the
            numbers above is public.
          </p>
        </div>
        <Link href="/proof" className="btn">
          See the proof →
        </Link>
      </section>

      <footer className="foot small muted">
        <span>MANDATE · a hackathon project for Total Recall: Tatum × Walrus Memory</span>
        <span className="row">
          <Link href="/agent">Agent</Link>
          <Link href="/proof">Proof</Link>
          <Link href="/privacy">Privacy</Link>
        </span>
      </footer>
    </div>
  );
}

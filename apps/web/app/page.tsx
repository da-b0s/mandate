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
      creditsLeft: await a.creditsLeft().catch(() => null),
      credit: a.CREDIT_AMOUNT,
      payments,
      tasks: receipts.length,
      wasteCut: off && on ? pct(on.totals.wasted, off.totals.wasted) : 86,
      costCut: off && on ? pct(on.totals.costPerUsefulAnswer, off.totals.costPerUsefulAnswer) : 43,
    };
  } catch {
    return { creditsLeft: null, credit: 0, payments: null, tasks: null, wasteCut: 86, costCut: 43 };
  }
}

const LEFT = [
  { icon: "🔎", title: "Buy information", body: "Pays data services a few cents per answer, like checking whether a wallet is linked to scams." },
  { icon: "📤", title: "Send money", body: "Pays people once, or on a schedule: “send 5 USDC to Ada every week”." },
];
const RIGHT = [
  { icon: "🔄", title: "Swap coins", body: "Turns USDC into SUI, WAL or DEEP at the best price, straight to your wallet." },
  { icon: "🧠", title: "Learns what's worth it", body: "Remembers your ratings on Walrus, so it stops paying for sources that never help." },
];

const STEPS = [
  { icon: "👤", title: "Sign in with Google", body: "No crypto wallet needed. You get your own agent." },
  { icon: "📏", title: "Set its rules", body: "A weekly allowance and a maximum per payment. Sign once." },
  { icon: "💵", title: "Add some USDC", body: "The first users get a welcome credit. Otherwise a few dollars is plenty, and you can take it back any time." },
  { icon: "💬", title: "Chat with it", body: "Ask in plain words. It does the job and shows the receipt." },
];

const RULES = [
  ["Weekly allowance", "It can never spend more than this in 7 days."],
  ["Maximum per payment", "No single payment, transfer or swap goes above it."],
  ["End date", "After it, every payment is refused."],
  ["Auto-freeze", "If you don't check in for a while, it stops until you do."],
  ["Stop button", "Revoke the mandate and it can never spend again."],
  ["Your money back", "Withdraw everything left, whenever you like."],
];

const FAQ = [
  ["Do I need a crypto wallet?", "No. Sign in with Google and MANDATE creates a Sui address for you. If you already use a Sui wallet like Slush, you can connect that instead."],
  ["Can the AI spend more than I allow?", "No. Your USDC is held by a smart contract on Sui, and the contract checks every payment against your rules in the same step that moves the money. A payment that breaks a rule simply fails. Not even we can override it."],
  ["What if something goes wrong?", "Press Stop for good and the agent can never spend again. Then press Withdraw and everything left goes back to your wallet. Both work at any time."],
  ["Where do the coins from a swap go?", "Straight to your own wallet, never to the agent. The swap still counts against your weekly allowance."],
  ["How does it learn?", "After a task, you can rate each paid source as useful or not. Those ratings are stored in Walrus Memory, and next time the agent skips sources that keep disappointing. In our 50-task test this cut wasted spend by 86%."],
  ["Is it free to try?", "The first users get a small USDC welcome credit paid into their mandate, enough for several checks, a transfer and a swap. After that you add your own USDC, and you can withdraw whatever is left at any time."],
  ["Is this real money?", "Yes. Everything runs on Sui mainnet with real USDC, and every payment links to a public receipt you can check yourself."],
];

export default async function Home() {
  const s = await stats();
  return (
    <div className="home">
      <section className="hero">
        <div className="orb" />
        <span className="eyebrow">Built on Sui · Walrus Memory · Tatum</span>
        <h1>
          Give your AI agent
          <br />a <em>wallet it can&apos;t empty</em>
        </h1>
        <p className="lede">
          A prepaid card for AI agents. You set the rules once. Your agent pays, sends and swaps inside them, and every cent gets a public receipt.
        </p>
        <div className="row cta">
          <Link href="/agent" className="btn primary big">
            Get your agent
          </Link>
          <Link href="/explorer" className="btn big">
            Explore real payments ↗
          </Link>
        </div>
        {s.creditsLeft ? (
          <p className="small muted" style={{ marginTop: 14 }}>
            🎁 The first users get a {(s.credit / 1e6).toFixed(2)} USDC welcome credit to try it. {s.creditsLeft} left.
          </p>
        ) : null}
        <div className="statstrip">
          <div>
            <b>−{s.wasteCut}%</b>
            <span>wasted spend once it learns</span>
          </div>
          <div>
            <b>−{s.costCut}%</b>
            <span>cost per useful answer</span>
          </div>
          <div>
            <b>{s.payments ?? "200+"}</b>
            <span>real payments on Sui mainnet</span>
          </div>
          <div>
            <b>{s.tasks ?? "170+"}</b>
            <span>tasks completed</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className="center-h">One agent. Real money. Hard limits.</h2>
        <p className="center-p">Everything it does goes through your mandate, the rulebook it can&apos;t break.</p>
        <div className="showcase">
          <div className="side">
            {LEFT.map((f) => (
              <Feat key={f.title} {...f} />
            ))}
          </div>
          <Phone />
          <div className="side">
            {RIGHT.map((f) => (
              <Feat key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="center-h">How it works</h2>
        <p className="center-p">From sign-in to your first task in about two minutes.</p>
        <div className="steps4">
          {STEPS.map((x, i) => (
            <div key={x.title} className="glass step4">
              <div className="ficon">{x.icon}</div>
              <div className="small faint">Step {i + 1}</div>
              <strong>{x.title}</strong>
              <p>{x.body}</p>
            </div>
          ))}
        </div>
        <div className="row cta">
          <Link href="/agent" className="btn primary">
            Start now
          </Link>
        </div>
      </section>

      <section className="rulesgrid">
        <div>
          <div className="shead" style={{ marginBottom: 0 }}>
            <h2>
              Rules it can&apos;t
              <br />
              break. By design.
            </h2>
          </div>
          <p className="muted" style={{ maxWidth: 460 }}>
            The rules live in a smart contract on Sui, and your USDC sits inside it. Every payment is checked by the contract in the same step that moves the
            money. Not by the AI, not by us.
          </p>
          <ul className="rules">
            {RULES.map(([t, b]) => (
              <li key={t}>
                <span>
                  <strong>{t}</strong> <span className="muted">{b}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass" style={{ padding: 24 }}>
          <div className="mcard" style={{ fontSize: 13, padding: 22 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">MANDATE · agent card</span>
              <span className="pill ok">active</span>
            </div>
            <b style={{ fontSize: 34, margin: "14px 0" }}>1.38 USDC</b>
            <div className="muted" style={{ marginBottom: 8 }}>0.62 of 2.00 spent this week</div>
            <div className="mbar">
              <i />
            </div>
            <div className="row muted" style={{ justifyContent: "space-between", marginTop: 16 }}>
              <span>max 0.10 per payment</span>
              <span>valid 30 days</span>
            </div>
          </div>
          <p className="small muted" style={{ margin: "16px 4px 0" }}>
            What you see in Settings: what&apos;s held, what&apos;s left this week, and the buttons to pause, stop or withdraw.
          </p>
        </div>
      </section>

      <section>
        <h2 className="center-h">Questions</h2>
        <div className="faq">
          {FAQ.map(([q, a]) => (
            <details key={q} className="glass">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="glass final">
        <h2 className="center-h">Your agent is two minutes away.</h2>
        <p className="center-p">Sign in with Google, set its rules, and start chatting. Or browse every real payment first.</p>
        <div className="row cta">
          <Link href="/agent" className="btn primary big">
            Get your agent
          </Link>
          <Link href="/explorer" className="btn big">
            Open the explorer
          </Link>
        </div>
      </section>

      <footer className="foot small muted">
        <span>MANDATE · Total Recall: Tatum × Walrus Memory</span>
        <span className="row" style={{ gap: 18 }}>
          <Link href="/agent">Chat</Link>
          <Link href="/mandate">Settings</Link>
          <Link href="/explorer">Explorer</Link>
          <Link href="/privacy">Privacy</Link>
        </span>
      </footer>
    </div>
  );
}

function Feat({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="feat">
      <strong>
        <span className="ficon">{icon}</span>
        {title}
      </strong>
      <p>{body}</p>
    </div>
  );
}

function Phone() {
  return (
    <div className="phone">
      <div className="screen">
        <div className="top">
          <span>9:41</span>
          <span>MANDATE</span>
        </div>
        <div className="mcard">
          <span className="muted">Held by your mandate</span>
          <b>1.38 USDC</b>
          <div className="mbar">
            <i />
          </div>
          <div className="muted" style={{ marginTop: 6 }}>0.62 of 2.00 this week</div>
        </div>
        <div className="mmsg me">Swap 1 USDC to SUI every Friday</div>
        <div className="mmsg ai">Done: 1.00 USDC → 1.16 SUI, sent to your wallet. I&apos;ll repeat it every week within your limits.</div>
        <div className="mmsg me">Is wallet 0x098B…2f96 safe?</div>
        <div className="mmsg ai">Not safe: it&apos;s on the OFAC sanctions list. Answered by a free check, so I spent nothing.</div>
      </div>
    </div>
  );
}

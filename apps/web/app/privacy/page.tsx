export const metadata = { title: "Privacy · MANDATE" };

// Plain statement of what the app stores. Needed for Google sign-in, and honest regardless.
export default function Privacy() {
  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      <h1>Privacy</h1>
      <p className="muted small">Last updated 5 November 2026. MANDATE is a hackathon project (Tatum x Walrus &quot;Total Recall&quot;).</p>
      <h2>What we store</h2>
      <ul>
        <li>
          <strong>Sign-in:</strong> if you sign in with Google, Enoki (Mysten Labs) derives a Sui address from your Google account using zkLogin.
          We see that address, not your password. We do not store your name or email.
        </li>
        <li>
          <strong>Tasks and receipts:</strong> what you ask the agent, its plan, the payments it made and the answer are stored in our database and
          as memories on Walrus, so the agent can learn and every payment has a receipt.
        </li>
        <li>
          <strong>Payments and limits:</strong> USDC payments, spending limits and their changes are recorded on the Sui blockchain, which is
          public by design.
        </li>
        <li>
          <strong>Ratings and preferences:</strong> your ratings and preferences are stored as Walrus Memory entries so the agent can recall them.
        </li>
      </ul>
      <h2>Who processes it</h2>
      <p>
        Render and Vercel (hosting), Neon (database), Walrus Memory (agent memory), Tatum (blockchain data and storage), Google Gemini (writing
        answers from the data the agent bought), Enoki and Google (sign-in).
      </p>
      <h2>What we do not do</h2>
      <p>We do not sell data, show ads, or use your data for anything beyond running the agent for you.</p>
      <h2>Contact</h2>
      <p>Open an issue on the project repository to ask a question or request deletion of your database records.</p>
    </div>
  );
}

import { agent, chain } from "@/lib/agent";
import { asSessionAgent } from "@/lib/session";
import { allowSponsored } from "@/lib/sponsor-guard";

export const runtime = "nodejs";

const usdc = (x: unknown) => Math.round(Number(x) * 1e6);

// Builds an owner transaction for the connected wallet to sign. Only the app owner may sign;
// the Move module enforces ownership too, this just fails early with a clear message.
export async function POST(req: Request) {
  const body = await req.json();
  // A signed-in user acts on their own mandate (and may create their first one).
  return asSessionAgent(() => build(body), { setup: true });
}

async function build(body: any) {
  const { action, sender } = body;
  const [a, c] = await Promise.all([agent(), chain()]);
  if (sender !== (await a.appOwner())) return Response.json({ error: "Connect the wallet that owns this mandate." }, { status: 403 });
  let tx;
  if (action === "send") {
    // From the owner's own wallet (swap output, withdrawals), not the mandate. The owner signs it.
    const { symbol, amount, to } = body;
    const coin = c.OWNER_COINS[symbol];
    if (!coin) return Response.json({ error: "Pick USDC, SUI, WAL or DEEP." }, { status: 400 });
    if (!/^0x[0-9a-fA-F]{64}$/.test(String(to ?? ""))) return Response.json({ error: "That isn't a Sui address (0x followed by 64 characters)." }, { status: 400 });
    if (String(to).toLowerCase() === sender) return Response.json({ error: "That's your own address." }, { status: 400 });
    const [whole, frac = ""] = String(amount ?? "").trim().split(".");
    if (!/^\d+$/.test(whole || "0") || !/^\d*$/.test(frac) || frac.length > coin.decimals) return Response.json({ error: "Enter an amount like 0.5." }, { status: 400 });
    const base = BigInt((whole || "0") + frac.padEnd(coin.decimals, "0"));
    const held = BigInt((await c.ownerBalances(sender)).find((b) => b.symbol === symbol)?.balance ?? "0");
    if (base <= 0n || base > held) return Response.json({ error: `You hold less than that. Your ${symbol} balance is ${Number(held) / 10 ** coin.decimals}.` }, { status: 400 });
    tx = c.ownerSendTx({ symbol, amount: base, to: String(to).toLowerCase() });
  } else if (action === "create") {
    const weeklyBudget = usdc(body.weeklyUsdc);
    const perCallCap = usdc(body.perCallUsdc);
    const days = Number(body.days);
    const dormancyMs = Math.round(Number(body.heartbeatHours) * 3_600_000);
    if (!(perCallCap > 0 && perCallCap <= weeklyBudget && weeklyBudget <= 50_000_000 && days >= 1 && days <= 365 && dormancyMs >= 60_000)) {
      return Response.json({ error: "Check the numbers: per-call cap must be above 0 and at most the weekly budget (max 50 USDC); 1-365 days; heartbeat at least 1 minute." }, { status: 400 });
    }
    tx = c.createGrantTx({ agent: a.agentAddress(), weeklyBudget, perCallCap, expiresMs: Date.now() + days * 86_400_000, dormancyMs });
  } else {
    const grantId = await a.activeGrantId();
    const grant = await c.readGrant(grantId);
    if (action === "cap") {
      const { payee, cap } = body;
      if (!/^0x[0-9a-f]{64}$/.test(payee) || !Number.isInteger(cap) || cap < 0 || cap > grant.perCallCap) {
        return Response.json({ error: "bad payee or cap" }, { status: 400 });
      }
      tx = c.setServiceCapTx({ grantId, payee, cap });
    } else if (action === "heartbeat") tx = c.heartbeatTx({ grantId });
    else if (action === "revoke") tx = c.revokeTx({ grantId });
    else if (action === "withdraw") {
      // Anything still in the agent's wallet goes into the grant first, so this really takes it all.
      await a.sweepWallet(grantId);
      const amount = await c.readVault(grantId);
      if (!amount) return Response.json({ error: "This mandate holds no USDC." }, { status: 400 });
      tx = c.withdrawTx({ grantId, amount });
    }
    else return Response.json({ error: "unknown action" }, { status: 400 });
  }
  const guard = await allowSponsored(sender, action === "create" ? "create" : "action");
  if (!guard.ok) return Response.json({ error: guard.error }, { status: 429 });
  // Gas is sponsored by the server key, so owners need no SUI (zkLogin users start with none).
  return Response.json({ bytes: await c.buildFor(tx, sender, { sponsor: c.agentSigner() }) });
}

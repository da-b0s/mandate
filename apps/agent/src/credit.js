// Welcome credit: the first few new agents get a little USDC paid straight into their mandate, so
// anyone (judges included) can try purchases, transfers and swaps without buying crypto first.
// It is paid by the platform wallet (AGENT_SUI_KEY) and lands inside the grant, so the user's own
// rules apply to it like any other money there.
import { Transaction } from "@mysten/sui/transactions";
import { addDeposit, agentSigner, execute, tatum, USDC_TYPE } from "@mandate/chain";
import { claimCredit, countCredited, releaseCredit, setAgentCredit } from "@mandate/store";

export const CREDIT_AMOUNT = Math.round(Number(process.env.WELCOME_CREDIT_USDC ?? 0.3) * 1e6);
export const CREDIT_LIMIT = Number(process.env.WELCOME_CREDITS ?? 10);

export async function creditsLeft() {
  return Math.max(0, CREDIT_LIMIT - (await countCredited()));
}

/** Returns { digest, amount } when paid, or { skipped } with a plain reason. Never throws. */
export async function grantWelcomeCredit(owner, grantId) {
  if (!(CREDIT_AMOUNT > 0) || CREDIT_LIMIT <= 0) return { skipped: "welcome credits are off" };
  // Claim first (atomic): two sign-ups at once cannot both take the last credit.
  if (!(await claimCredit(owner, CREDIT_LIMIT))) return { skipped: "all welcome credits have been given out" };
  try {
    const platform = agentSigner();
    const { balances } = await tatum.listBalances({ owner: platform.toSuiAddress() });
    const held = Number(balances.find((b) => b.coinType === USDC_TYPE)?.balance ?? 0);
    if (held < CREDIT_AMOUNT) {
      await releaseCredit(owner);
      return { skipped: "welcome credits are not funded yet" };
    }
    const t = await execute(addDeposit(new Transaction(), { grantId, amount: CREDIT_AMOUNT }), platform);
    await setAgentCredit(owner, t.digest);
    return { digest: t.digest, amount: CREDIT_AMOUNT };
  } catch (e) {
    await releaseCredit(owner).catch(() => {});
    return { skipped: `the welcome credit could not be sent (${String(e.message ?? e).slice(0, 80)})` };
  }
}

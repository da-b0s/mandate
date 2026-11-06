// USDC lives inside the grant. People fund an agent by sending USDC to its address, and the agent
// moves that into the grant at its next payment, so its own wallet holds money only briefly.
import { Transaction } from "@mysten/sui/transactions";
import { addDeposit, execute, readVault, tatum, USDC_TYPE } from "@mandate/chain";
import { currentSigner, currentSponsor } from "./context.js";

/** { vault, wallet } in USDC base units. */
export async function fundsFor(grantId) {
  const [vault, { balances }] = await Promise.all([readVault(grantId), tatum.listBalances({ owner: currentSigner().toSuiAddress() })]);
  return { vault, wallet: Number(balances.find((b) => b.coinType === USDC_TYPE)?.balance ?? 0) };
}

/** Move all of the agent's wallet USDC into the grant. Returns the digest, or null if there was none. */
export async function sweepWallet(grantId) {
  const { wallet } = await fundsFor(grantId);
  if (!wallet) return null;
  const t = await execute(addDeposit(new Transaction(), { grantId, amount: wallet }), currentSigner(), { sponsor: currentSponsor() });
  return t.digest;
}

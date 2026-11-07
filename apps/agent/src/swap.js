// Swapping for the owner: USDC leaves the mandate through grant::begin_swap, which checks every
// limit, goes through the best route Aftermath's router finds across Sui exchanges, and the output
// is handed to the owner by grant::finish_swap in the same transaction. The agent never holds it.
import { Transaction } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import { Aftermath } from "aftermath-ts-sdk";
import { checkGrant } from "@mandate/policy";
import { execute, PACKAGE_ID, readGrant, tatum, USDC_TYPE } from "@mandate/chain";
import { currentSigner, currentSponsor } from "./context.js";
import { fundsFor, sweepWallet } from "./custody.js";

/** Coins the agent may buy, with display decimals. Kept short on purpose: no long-tail tokens. */
export const SWAP_COINS = {
  SUI: { type: "0x2::sui::SUI", decimals: 9 },
  WAL: { type: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL", decimals: 9 },
  DEEP: { type: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP", decimals: 6 },
};
const SLIPPAGE = 0.01;
const ABORTS = { 2: "revoked", 3: "expired", 4: "dormant", 5: "over_cap", 6: "budget", 11: "funds" };

let router;
const getRouter = async () => (router ??= (await Aftermath.create({ network: "MAINNET" })).Router());

export const fmtCoin = (amount, symbol) => (Number(amount) / 10 ** SWAP_COINS[symbol].decimals).toFixed(SWAP_COINS[symbol].decimals === 9 ? 4 : 2);

/** Returns { digest, amount, symbol, received } or { denied: { reason, detail } }. */
export async function swapUsdc({ grantId, symbol, amount, log = () => {} }) {
  const coin = SWAP_COINS[symbol];
  if (!coin) return { denied: { reason: "unsupported", detail: `I can swap into ${Object.keys(SWAP_COINS).join(", ")}` } };
  const signer = currentSigner();
  const grant = await readGrant(grantId);
  // Swaps count against the limits with the owner as payee; the contract repeats this check.
  const pre = checkGrant(grant, grant.owner, amount, Date.now());
  if (!pre.ok) return { denied: { reason: pre.reason, detail: pre.detail } };
  const funds = await fundsFor(grantId);
  if (funds.vault + funds.wallet < amount) return { denied: { reason: "funds", detail: "the mandate does not hold enough USDC" } };
  log({ step: "grant-ok", spentThisWeek: grant.spentThisWeek, weeklyBudget: grant.weeklyBudget });

  const r = await getRouter();
  const route = await r.getCompleteTradeRouteGivenAmountIn({ coinInType: USDC_TYPE, coinOutType: coin.type, coinInAmount: BigInt(amount) });
  log({ step: "swap-quote", symbol, amount, expected: String(route.coinOut.amount), slippage: SLIPPAGE });

  // Wallet USDC goes into the mandate in its own transaction first: Aftermath's server rebuilds the
  // transaction it extends, and a coin-selection step before ours would shift the result indices.
  if (funds.wallet > 0) await sweepWallet(grantId);

  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  const [usdcIn, ticket] = tx.moveCall({
    target: `${PACKAGE_ID}::grant::begin_swap`,
    typeArguments: [USDC_TYPE],
    arguments: [tx.object(grantId), tx.pure.u64(amount), tx.object.clock()],
  });
  const { tx: full, coinOutId } = await r.addTransactionForCompleteTradeRoute({
    tx,
    walletAddress: signer.toSuiAddress(),
    completeRoute: route,
    slippage: SLIPPAGE,
    coinInId: usdcIn,
  });
  if (!coinOutId) throw new Error("the exchange route did not return the swapped coin");
  full.moveCall({ target: `${PACKAGE_ID}::grant::finish_swap`, typeArguments: [coin.type], arguments: [full.object(grantId), ticket, coinOutId] });

  let t;
  try {
    t = await execute(full, signer, { sponsor: currentSponsor() });
  } catch (e) {
    const msg = String(e.message ?? e);
    const code = msg.match(/MoveAbort[^0-9]*\d+[^0-9]+(\d+)\)?/)?.[1] ?? msg.match(/abort code:?\s*(\d+)/i)?.[1];
    if (code && ABORTS[code] && /grant/.test(msg)) return { denied: { reason: ABORTS[code], detail: "refused by the Move contract; nothing moved" } };
    if (/slippage|price/i.test(msg)) return { denied: { reason: "slippage", detail: "the price moved more than 1%; nothing moved, try again" } };
    throw e;
  }
  log({ step: "swapped", digest: t.digest });

  // Independent check through Tatum: the contract's Swapped event says what reached the owner, and
  // the owner's balance went up in that coin. (Types come back in long form, e.g. 0x000…2::sui::SUI.
  // When owner and agent are one wallet, the gas is netted in, so only check the direction.)
  const v = await tatum.waitForTransaction({ digest: t.digest, include: { balanceChanges: true, effects: true, events: true } });
  const vt = v.Transaction ?? v.FailedTransaction;
  const want = normalizeStructTag(coin.type);
  const ev = vt.events?.find((e) => e.eventType.endsWith("::grant::Swapped"));
  const got = vt.balanceChanges.find((b) => b.address === grant.owner && normalizeStructTag(b.coinType) === want && BigInt(b.amount) > 0n);
  if (!vt.effects.status.success || !ev || !got) throw new Error(`swap ${t.digest} failed Tatum verification`);
  const received = String(ev.json?.amount_out ?? got.amount);
  log({ step: "verified", digest: t.digest, amount, payee: grant.owner, verifiedVia: "tatum-grpc" });
  return { digest: t.digest, amount, symbol, received, owner: grant.owner };
}

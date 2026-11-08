// The owner's own wallet (not the mandate): what it holds, and a plain send the owner signs.
// Google users have no other wallet app for their zkLogin address, so this is how they move coins
// they received from swaps or withdrawals. The agent never touches this.
import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { normalizeStructTag } from "@mysten/sui/utils";
import { tatum } from "./tatum.js";
import { USDC_TYPE } from "./grant.js";

export const OWNER_COINS = {
  USDC: { type: USDC_TYPE, decimals: 6 },
  SUI: { type: "0x2::sui::SUI", decimals: 9 },
  WAL: { type: "0x356a26eb9e012a68958082340d4c4116e7f55615cf27affcff209cf0ae544f59::wal::WAL", decimals: 9 },
  DEEP: { type: "0xdeeb7a4662eec9f2f3def03fb937a663dddaa2e215b8078a284d026b7946c270::deep::DEEP", decimals: 6 },
};

/** [{ symbol, decimals, balance }] in base units, through Tatum. */
export async function ownerBalances(address) {
  const { balances } = await tatum.listBalances({ owner: address });
  const held = new Map(balances.map((b) => [normalizeStructTag(b.coinType), b.balance]));
  return Object.entries(OWNER_COINS).map(([symbol, c]) => ({ symbol, decimals: c.decimals, balance: String(held.get(normalizeStructTag(c.type)) ?? "0") }));
}

/** Send `amount` (base units) of a supported coin from the owner to `to`. Gas is sponsored separately. */
export function ownerSendTx({ symbol, amount, to }) {
  const coin = OWNER_COINS[symbol];
  if (!coin) throw new Error(`unsupported coin ${symbol}`);
  const tx = new Transaction();
  // useGasCoin: false, because the sponsor pays gas, so SUI must come from the owner's own balance.
  tx.transferObjects([coinWithBalance({ type: coin.type, balance: BigInt(amount), useGasCoin: false })], to);
  return tx;
}

// Show agent + vendor balances via Tatum gRPC (never prints keys).
import "dotenv/config";
import { tatum } from "@mandate/chain";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_SUI_KEY.trim());
const agent = Ed25519Keypair.fromSecretKey(secretKey).toSuiAddress();
for (const [name, owner] of [["agent", agent], ["vendor", process.env.MPP_RECIPIENT.trim()]]) {
  const { balances } = await tatum.listBalances({ owner });
  console.log(name, owner, balances.map(b => `${b.coinType.split("::").pop()}=${b.balance}`).join(" "));
}

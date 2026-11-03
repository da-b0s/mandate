// Pay an MPP-on-Sui endpoint from the agent wallet, then verify via Tatum.
// Usage: node scripts/buy.js <url> [maxUsdc=0.10]
import "dotenv/config";
import { Mppx } from "mppx/client";
import { USDC, sui } from "@suimpp/mpp/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { tatum } from "@mandate/chain";

const [url, max = "0.10"] = process.argv.slice(2);
const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_SUI_KEY.trim());
const signer = Ed25519Keypair.fromSecretKey(secretKey);
const client = new SuiGrpcClient({ baseUrl: "https://fullnode.mainnet.sui.io:443", network: "mainnet" });

let quoted;
const mppx = Mppx.create({
  polyfill: false,
  methods: [sui({ client, signer, currency: USDC })],
  async onChallenge(challenge, { createCredential }) {
    quoted = challenge.request;
    if (Number(quoted.amount) > Number(max)) throw new Error(`GRANT_DENIED: over_cap (${quoted.amount} > ${max})`);
    return createCredential();
  },
});

const res = await mppx.fetch(url);
console.log("status", res.status, JSON.stringify(await res.json(), null, 2));
const receipt = res.headers.get("payment-receipt");
if (!receipt) process.exit(0);
const { reference: digest } = JSON.parse(Buffer.from(receipt, "base64url").toString());
const tx = await tatum.waitForTransaction({ digest, include: { balanceChanges: true, effects: true, transaction: true } });
const t = tx.Transaction ?? tx.FailedTransaction;
const paid = t.balanceChanges.find((b) => b.address === quoted.recipient && b.coinType === quoted.currency);
console.log("Tatum verify:", { success: t.effects.status.success, fromAgent: t.transaction.sender === signer.toSuiAddress(), paid: paid?.amount });
console.log(`Suiscan: https://suiscan.xyz/mainnet/tx/${digest}`);

// Day-0 spike: agent pays a local vendor 0.01 USDC via MPP on Sui mainnet,
// a policy hook can refuse before paying, and Tatum gRPC verifies the payment.
import "dotenv/config";
import http from "node:http";
import { Mppx as MppxServer } from "mppx/server";
import { Mppx } from "mppx/client";
import { InMemoryDigestStore, USDC as USDC_S, sui as suiServer } from "@suimpp/mpp/server";
import { USDC, sui } from "@suimpp/mpp/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { tatum } from "@mandate/chain";

const PRICE = process.env.SPIKE_PRICE ?? "0.01";
const recipient = process.env.MPP_RECIPIENT.trim();

// --- Vendor (seller side) on localhost ---
const vendor = MppxServer.create({
  realm: "mandate-spike",
  methods: [suiServer({ currency: USDC_S, recipient, store: new InMemoryDigestStore(), network: "mainnet" })],
});
const charge = MppxServer.toNodeListener(vendor.charge({ amount: PRICE }));
const server = http.createServer(async (req, res) => {
  const result = await charge(req, res);
  if (result.status === 402) return;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ report: "wallet looks clean (spike)" }));
}).listen(4021);

// --- Agent (buyer side) ---
const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_SUI_KEY.trim());
const signer = Ed25519Keypair.fromSecretKey(secretKey);
const client = new SuiGrpcClient({ baseUrl: "https://fullnode.mainnet.sui.io:443", network: "mainnet" });
const MAX_PER_CALL = 0.10; // stand-in for the onchain grant check

const mppx = Mppx.create({
  polyfill: false,
  methods: [sui({ client, signer, currency: USDC })],
  async onChallenge(challenge, { createCredential }) {
    console.log("402 challenge:", JSON.stringify(challenge.request));
    const amount = Number(challenge.request.amount); // decimal USDC, e.g. "0.01"
    if (amount > MAX_PER_CALL) throw new Error(`GRANT_DENIED: over_cap (${amount})`);
    return createCredential();
  },
});

try {
  const res = await mppx.fetch("http://localhost:4021/v1/wallet-risk");
  console.log("Vendor status:", res.status, await res.json());
  const receipt = res.headers.get("payment-receipt");
  const decoded = JSON.parse(Buffer.from(receipt, "base64url").toString());
  console.log("Receipt:", decoded);
  const digest = decoded.reference ?? decoded.digest;

  // --- Verify via Tatum ---
  const tx = await tatum.waitForTransaction({ digest, include: { balanceChanges: true, effects: true, transaction: true } });
  const t = tx.Transaction ?? tx.FailedTransaction ?? tx;
  const toVendor = t.balanceChanges.find(b => b.address === recipient && b.coinType.endsWith("::usdc::USDC"));
  console.log("Tatum verify:", { success: t.effects?.status?.success, sender: t.transaction?.sender === signer.toSuiAddress(), usdcToVendor: toVendor?.amount });
  console.log(`Suiscan: https://suiscan.xyz/mainnet/tx/${digest}`);
} finally {
  server.close();
}

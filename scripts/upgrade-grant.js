// Upgrade the published mandate package in place, using the UpgradeCap in the main wallet.
// Existing grants keep working. Usage: SUI_BIN=... node scripts/upgrade-grant.js [--dry-run]
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { Transaction, UpgradePolicy } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const SUI_BIN = process.env.SUI_BIN ?? "sui";
const dryRun = process.argv.includes("--dry-run");
const FILE = "packages/move/published.json";
const published = JSON.parse(readFileSync(FILE, "utf8"));

const { modules, dependencies, digest } = JSON.parse(
  execFileSync(SUI_BIN, ["move", "build", "--dump-bytecode-as-base64", "--path", "packages/move"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);

const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_SUI_KEY.trim());
const signer = Ed25519Keypair.fromSecretKey(secretKey);
const client = new SuiGrpcClient({ baseUrl: "https://fullnode.mainnet.sui.io:443", network: "mainnet" });

const tx = new Transaction();
const cap = tx.object(published.upgradeCap);
const ticket = tx.moveCall({
  target: "0x2::package::authorize_upgrade",
  arguments: [cap, tx.pure.u8(UpgradePolicy.COMPATIBLE), tx.pure.vector("u8", digest)],
});
const receipt = tx.upgrade({ modules, dependencies, package: published.packageId, ticket });
tx.moveCall({ target: "0x2::package::commit_upgrade", arguments: [cap, receipt] });
tx.setSender(signer.toSuiAddress());

if (dryRun) {
  const sim = await client.simulateTransaction({ transaction: tx, include: { effects: true } });
  const t = sim.Transaction ?? sim.FailedTransaction;
  console.log("Simulated:", JSON.stringify(t.effects.status), "gas:", JSON.stringify(t.effects.gasUsed));
  process.exit(t.effects.status.success ? 0 : 1);
}

const res = await client.signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true } });
const t = res.Transaction ?? res.FailedTransaction;
if (!t.effects.status.success) throw new Error(`Upgrade failed: ${JSON.stringify(t.effects.status)}`);
const pkg = t.effects.changedObjects.find((o) => o.outputState === "PackageWrite")?.objectId;
const out = {
  ...published,
  originalId: published.originalId ?? published.packageId,
  packageId: pkg,
  upgradeDigest: t.digest,
  upgradedAt: new Date().toISOString(),
};
writeFileSync(FILE, JSON.stringify(out, null, 2) + "\n");
console.log(out);

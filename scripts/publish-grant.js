// Publish packages/move (mandate::grant) to Sui mainnet from the agent wallet.
// Usage: node scripts/publish-grant.js [--dry-run]
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { Transaction } from "@mysten/sui/transactions";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

const SUI_BIN = process.env.SUI_BIN ?? "sui";
const dryRun = process.argv.includes("--dry-run");

const { modules, dependencies } = JSON.parse(
  execFileSync(SUI_BIN, ["move", "build", "--dump-bytecode-as-base64", "--path", "packages/move"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }),
);

const { secretKey } = decodeSuiPrivateKey(process.env.AGENT_SUI_KEY.trim());
const signer = Ed25519Keypair.fromSecretKey(secretKey);
const client = new SuiGrpcClient({ baseUrl: "https://fullnode.mainnet.sui.io:443", network: "mainnet" });

const tx = new Transaction();
const [upgradeCap] = tx.publish({ modules, dependencies });
tx.transferObjects([upgradeCap], signer.toSuiAddress());
tx.setSender(signer.toSuiAddress());

if (dryRun) {
  const sim = await client.simulateTransaction({ transaction: tx, include: { effects: true } });
  const t = sim.Transaction ?? sim.FailedTransaction;
  console.log("Simulated:", t.effects.status, "gas:", t.effects.gasUsed);
  process.exit(0);
}

const res = await client.signAndExecuteTransaction({ transaction: tx, signer, include: { effects: true, objectTypes: true } });
const t = res.Transaction ?? res.FailedTransaction;
if (!t.effects.status.success) throw new Error(`Publish failed: ${JSON.stringify(t.effects.status)}`);
const pkg = t.effects.changedObjects.find((o) => o.outputState === "PackageWrite")?.objectId;
const cap = Object.entries(t.objectTypes ?? {}).find(([, ty]) => ty.endsWith("::package::UpgradeCap"))?.[0];
const out = { network: "mainnet", packageId: pkg, upgradeCap: cap, digest: t.digest, publishedAt: new Date().toISOString() };
writeFileSync("packages/move/published.json", JSON.stringify(out, null, 2) + "\n");
console.log(out);
console.log(`Suiscan: https://suiscan.xyz/mainnet/tx/${t.digest}`);

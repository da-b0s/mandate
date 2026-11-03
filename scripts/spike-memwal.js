// Day-0 spike: save one memory on mainnet Walrus Memory, then recall it.
import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";

const memwal = MemWal.create({
  key: process.env.MEMWAL_PRIVATE_KEY,
  accountId: process.env.MEMWAL_ACCOUNT_ID,
  serverUrl: process.env.MEMWAL_SERVER_URL,
  namespace: "mandate-spike",
});

const text = `[mdt1|spike|${new Date().toISOString()}] MANDATE spike: vendor "Premium Summariser" rated useless on wallet-risk tasks.`;
console.log("Saving:", text);
const saved = await memwal.rememberAndWait(text, undefined, { timeoutMs: 60_000 });
console.log("Saved:", JSON.stringify(saved, null, 2));

const found = await memwal.recall({ query: "which vendor was useless for wallet risk?", topK: 3, maxDistance: 0.8 });
console.log("Recalled:", JSON.stringify(found, null, 2));

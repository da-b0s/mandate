// One-off: copy receipts saved as local files (before Postgres) into the database.
import { readdirSync, readFileSync } from "node:fs";
import { saveReceipt } from "@mandate/store";

const files = readdirSync("data/receipts").filter((f) => f.endsWith(".json"));
for (const f of files) await saveReceipt(JSON.parse(readFileSync(`data/receipts/${f}`, "utf8")));
console.log(`imported ${files.length} receipts`);

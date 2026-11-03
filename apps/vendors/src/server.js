// MPP-paid vendor services. Each route charges USDC on Sui before serving.
import "dotenv/config";
import http from "node:http";
import { Mppx } from "mppx/server";
import { USDC, sui } from "@suimpp/mpp/server";
import { InMemoryDigestStore } from "@suimpp/mpp/server";
import { PgDigestStore } from "@mandate/store";
import { walletRiskReport } from "./wallet-risk.js";
import { holderCheck } from "./holders.js";
import { premiumSummary } from "./summary.js";

const PORT = Number(process.env.PORT ?? 4021);

// Used payment digests must survive restarts, or a paid digest could be replayed after a redeploy.
const hasDb = Boolean(process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL);
if (!hasDb) console.warn("No DATABASE_URL: using in-memory digest store (replays possible after restart)");
const store = hasDb ? new PgDigestStore() : new InMemoryDigestStore();
const charger = (recipient) =>
  Mppx.create({
    realm: process.env.MPP_REALM ?? "mandate-vendors",
    methods: [sui({ currency: USDC, recipient: recipient.trim(), store, network: "mainnet" })],
  });
// Each vendor has its own payout address so the grant can cap or block it individually.
const payTo = (name) => charger(process.env[`MPP_RECIPIENT_${name}`] || process.env.MPP_RECIPIENT);

const routes = {
  "/v1/wallet-risk": { price: "0.02", mppx: payTo("WALLET_RISK"), run: (q) => walletRiskReport(q.get("address") ?? "") },
  "/v1/holders": { price: "0.03", mppx: payTo("HOLDERS"), run: (q) => holderCheck(q.get("token") ?? "", q.get("chain") ?? undefined) },
  "/v1/summary": { price: "0.05", mppx: payTo("SUMMARY"), run: (q) => premiumSummary(q.get("address") ?? "") },
};

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/health") return res.end("ok");
    const route = routes[url.pathname];
    if (!route) {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: "not found", routes: Object.keys(routes) }));
    }
    try {
      const paid = await Mppx.toNodeListener(route.mppx.charge({ amount: route.price }))(req, res);
      if (paid.status === 402) return;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify(await route.run(url.searchParams)));
    } catch (e) {
      // Paid but failed to deliver: the agent marks this refund-worthy.
      res.statusCode = 502;
      res.end(JSON.stringify({ error: String(e.message ?? e) }));
    }
  })
  .listen(PORT, () => console.log(`vendors on :${PORT}`));

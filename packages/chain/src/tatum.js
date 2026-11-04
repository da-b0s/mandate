// Sui mainnet client over Tatum's native gRPC gateway.
import "dotenv/config";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";

const client = new SuiGrpcClient({
  network: "mainnet",
  transport: new GrpcTransport({
    host: "sui-mainnet-grpc.gateway.tatum.io:443",
    channelCredentials: ChannelCredentials.createSsl(),
    meta: { "x-api-key": process.env.TATUM_API_KEY },
  }),
});

// Tatum's plan rate-limits bursts (HTTP 429 surfaces as gRPC UNAVAILABLE), and DNS or the
// connection occasionally drops. Every call through this client is a read, so retrying is safe.
const transient = (e) => e?.code === "UNAVAILABLE" || e?.code === "RESOURCE_EXHAUSTED" || /429|fetch failed|ECONNRESET/.test(String(e?.message));

async function withRetry(fn, attempts = 5) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= attempts || !transient(e)) throw e;
      await new Promise((r) => setTimeout(r, 400 * 2 ** i + Math.random() * 300));
    }
  }
}

export const tatum = new Proxy(client, {
  get(target, prop, receiver) {
    const v = Reflect.get(target, prop, receiver);
    return typeof v === "function" ? (...args) => withRetry(() => v.apply(target, args)) : v;
  },
});

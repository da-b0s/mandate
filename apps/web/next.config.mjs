import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
try {
  process.loadEnvFile(path.join(root, ".env"));
} catch {}
process.env.MANDATE_DATA ??= path.join(root, "data");

/** @type {import('next').NextConfig} */
export default {
  // The agent stack is plain Node ESM (gRPC, native TS stripping); load it at runtime, don't bundle it.
  serverExternalPackages: ["@mandate/agent", "@mandate/chain", "@mandate/policy", "@grpc/grpc-js", "@mysten-incubation/memwal", "mppx", "@suimpp/mpp"],
  outputFileTracingRoot: root,
};

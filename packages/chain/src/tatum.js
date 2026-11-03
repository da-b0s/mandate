// Sui mainnet client over Tatum's native gRPC gateway.
import "dotenv/config";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import { ChannelCredentials } from "@grpc/grpc-js";

export const tatum = new SuiGrpcClient({
  network: "mainnet",
  transport: new GrpcTransport({
    host: "sui-mainnet-grpc.gateway.tatum.io:443",
    channelCredentials: ChannelCredentials.createSsl(),
    meta: { "x-api-key": process.env.TATUM_API_KEY },
  }),
});

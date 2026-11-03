// Day-0 spike: read Sui mainnet through Tatum's gRPC gateway.
import { tatum } from "@mandate/chain";

const owner = process.argv[2] ?? "0x0520a2fd4beef5fac411f9b8290bd090d36444f01bb8cc8a8fad9bbc1e5ce9fa";
const { balance } = await tatum.getBalance({ owner });
console.log("SUI balance via Tatum gRPC:", balance);

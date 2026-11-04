"use client";
import "@mysten/dapp-kit/dist/index.css";
import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

// The wallet only signs: the server builds and submits transactions over gRPC.
// dapp-kit still wants a network entry, so give it mainnet.
const { networkConfig } = createNetworkConfig({ mainnet: { url: "https://fullnode.mainnet.sui.io:443", network: "mainnet" } as any });

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={qc}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

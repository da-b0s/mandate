"use client";
import "@mysten/dapp-kit/dist/index.css";
import { createNetworkConfig, SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { registerEnokiWallets } from "@mysten/enoki";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";

// The wallet only signs: the server builds and submits transactions over gRPC.
// dapp-kit still wants a network entry, so give it mainnet.
const { networkConfig } = createNetworkConfig({ mainnet: { url: "https://fullnode.mainnet.sui.io:443", network: "mainnet" } as any });

const ENOKI_KEY = process.env.NEXT_PUBLIC_ENOKI_API_KEY;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

// "Sign in with Google" (zkLogin via Enoki) appears as a wallet next to Slush in the Connect dialog.
function useEnokiWallets() {
  useEffect(() => {
    if (!ENOKI_KEY || !GOOGLE_CLIENT_ID) return;
    const { unregister } = registerEnokiWallets({
      apiKey: ENOKI_KEY,
      network: "mainnet",
      client: new SuiGrpcClient({ baseUrl: "https://fullnode.mainnet.sui.io:443", network: "mainnet" }),
      // Google needs exact redirect URIs; always return to the site root (registered per origin).
      providers: { google: { clientId: GOOGLE_CLIENT_ID, redirectUrl: `${window.location.origin}/` } },
    });
    return unregister;
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  useEnokiWallets();
  return (
    <QueryClientProvider client={qc}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="mainnet">
        <WalletProvider autoConnect>{children}</WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

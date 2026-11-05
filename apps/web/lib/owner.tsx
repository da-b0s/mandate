"use client";
// One "who is signing" interface over both sign-in options: a browser wallet (Slush) or Google (zkLogin).
import { ConnectButton, useCurrentAccount, useDisconnectWallet, useSignPersonalMessage, useSignTransaction } from "@mysten/dapp-kit";
import { createContext, useContext, useEffect, useState } from "react";
import { completeGoogleLogin, googleLoginAvailable, startGoogleLogin, zkSession, zkSignMessage, zkSignOut, zkSignTransaction, type ZkSession } from "./zk";

type Owner = {
  address: string | null;
  kind: "wallet" | "google" | null;
  label: string | null;
  signTransaction: (bytesB64: string) => Promise<string>;
  signMessage: (message: Uint8Array) => Promise<string>;
  signOut: () => void;
  error: string | null;
};

const Ctx = createContext<Owner | null>(null);

export function OwnerProvider({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const { mutateAsync: walletSignTx } = useSignTransaction();
  const { mutateAsync: walletSignMsg } = useSignPersonalMessage();
  const { mutate: disconnect } = useDisconnectWallet();
  const [zk, setZk] = useState<ZkSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setZk(zkSession());
    completeGoogleLogin()
      .then((returnTo) => {
        if (!returnTo) return;
        setZk(zkSession());
        if (returnTo !== location.pathname) location.assign(returnTo);
      })
      .catch((e) => setError(`Google sign-in failed: ${String(e.message ?? e)}`));
  }, []);

  const value: Owner = zk
    ? {
        address: zk.address,
        kind: "google",
        label: zk.email ?? "Google",
        signTransaction: (b) => zkSignTransaction(zk, b),
        signMessage: (m) => zkSignMessage(zk, m),
        signOut: () => {
          zkSignOut();
          setZk(null);
        },
        error,
      }
    : {
        address: account?.address ?? null,
        kind: account ? "wallet" : null,
        label: account ? "Wallet" : null,
        signTransaction: async (b) => (await walletSignTx({ transaction: b, chain: "sui:mainnet" })).signature,
        signMessage: async (m) => (await walletSignMsg({ message: m })).signature,
        signOut: () => disconnect(),
        error,
      };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOwner() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOwner outside OwnerProvider");
  return v;
}

export function SignIn() {
  const o = useOwner();
  if (o.address) {
    return (
      <div className="row small">
        <span className="pill">{o.kind === "google" ? `Google · ${o.label}` : "Wallet"}</span>
        <code>{o.address.slice(0, 8)}…{o.address.slice(-4)}</code>
        <button onClick={o.signOut}>Sign out</button>
      </div>
    );
  }
  return (
    <div className="row">
      {googleLoginAvailable && (
        <button className="primary" onClick={() => startGoogleLogin()}>
          Sign in with Google
        </button>
      )}
      <ConnectButton connectText="Use a Sui wallet" />
      {o.error && <span className="pill bad">{o.error}</span>}
    </div>
  );
}

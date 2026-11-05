"use client";
// One "who is signing" interface over both sign-in options: a browser wallet (Slush) or Google (zkLogin).
import { ConnectButton, useCurrentAccount, useDisconnectWallet, useSignPersonalMessage, useSignTransaction } from "@mysten/dapp-kit";
import { createContext, useContext, useEffect, useState } from "react";
import { completeGoogleLogin, googleLoginAvailable, startGoogleLogin, zkSession, zkSignMessage, zkSignOut, zkSignTransaction, type ZkSession } from "./zk";

export type Me = { owner: string | null; agent?: { address: string; grantId: string | null; usdc: number; credited: boolean } | null };

type Owner = {
  me: Me | null;
  refreshMe: () => Promise<void>;
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
  const [me, setMe] = useState<Me | null>(null);
  const refreshMe = async () => setMe(await fetch("/api/me").then((r) => r.json()).catch(() => ({ owner: null })));

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

  const address = zk?.address ?? account?.address ?? null;
  const signMessage = (m: Uint8Array) => (zk ? zkSignMessage(zk, m) : walletSignMsg({ message: m }).then((r) => r.signature));

  // Server session: once per sign-in, prove control of the address by signing a short message.
  useEffect(() => {
    refreshMe();
  }, []);
  useEffect(() => {
    if (!address || !me || me.owner === address) return;
    const issuedAt = new Date().toISOString();
    const message = `Sign in to MANDATE
address: ${address}
issued: ${issuedAt}`;
    signMessage(new TextEncoder().encode(message))
      .then((signature) => fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ address, issuedAt, signature }) }))
      .then((r) => r.json())
      .then((j) => (j.error ? setError(j.error) : refreshMe()))
      .catch((e) => setError(String(e.message ?? e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, me?.owner]);

  const endSession = () => fetch("/api/auth/logout", { method: "POST" }).then(refreshMe);

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
          endSession();
        },
        error,
        me,
        refreshMe,
      }
    : {
        address: account?.address ?? null,
        kind: account ? "wallet" : null,
        label: account ? "Wallet" : null,
        signTransaction: async (b) => (await walletSignTx({ transaction: b, chain: "sui:mainnet" })).signature,
        signMessage: async (m) => (await walletSignMsg({ message: m })).signature,
        signOut: () => {
          disconnect();
          endSession();
        },
        error,
        me,
        refreshMe,
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

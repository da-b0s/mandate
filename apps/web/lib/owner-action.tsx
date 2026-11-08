"use client";
// One owner action, start to finish: the server builds the transaction, the owner's sign-in
// (Google or wallet) signs it, the server submits it with gas sponsored. Used by setup and Settings.
import { useState } from "react";
import { useOwner } from "./owner";
import { usdc } from "./format";

export type ActionResult = { ok: boolean; text: string; digest?: string; memoryBlob?: string; credit?: number };

const DONE: Record<string, string> = {
  create: "Rules signed. Your agent now follows them.",
  cap: "Change approved on Sui.",
  heartbeat: "Checked in. The auto-freeze timer restarted.",
  revoke: "Mandate stopped for good.",
  withdraw: "Your USDC is on its way to your wallet.",
  send: "Sent from your wallet.",
};

export function useOwnerAction(onDone?: () => void) {
  const owner = useOwner();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  async function act(key: string, body: Record<string, unknown>) {
    if (!owner.address) return;
    setBusy(key);
    setResult(null);
    try {
      const built = await fetch("/api/owner/build", { method: "POST", body: JSON.stringify({ ...body, sender: owner.address }) }).then((r) => r.json());
      if (built.error) throw new Error(built.error);
      const signature = await owner.signTransaction(built.bytes);
      const sent = await fetch("/api/owner/submit", { method: "POST", body: JSON.stringify({ bytes: built.bytes, signature, action: body.action }) }).then((r) => r.json());
      if (sent.error) throw new Error(sent.error);
      const bonus = sent.credit?.amount ? ` Welcome bonus: we added ${usdc(sent.credit.amount)} to your mandate.` : "";
      setResult({
        ok: true,
        text: (DONE[String(body.action)] ?? "Confirmed on Sui.") + bonus,
        digest: sent.digest,
        memoryBlob: sent.ratification?.memoryBlob,
        credit: sent.credit?.amount,
      });
      onDone?.();
      await owner.refreshMe();
    } catch (e) {
      setResult({ ok: false, text: String((e as Error).message ?? e) });
    } finally {
      setBusy(null);
    }
  }

  return { busy, result, act };
}

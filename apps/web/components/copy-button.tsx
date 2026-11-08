"use client";
import { useState } from "react";
import { Icon } from "./icons";

/**
 * Copy text with visible confirmation. Uses the Clipboard API when the browser allows it, and falls
 * back to a hidden textarea + execCommand where it is blocked (some embedded browsers and older
 * mobile browsers), so the button never silently does nothing.
 */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy(text);
    setState(ok ? "done" : "failed");
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button type="button" onClick={copy} aria-live="polite">
      {state === "done" ? (
        <>
          <Icon name="check" size={14} /> Copied
        </>
      ) : state === "failed" ? (
        "Select and copy it"
      ) : (
        label
      )}
    </button>
  );
}

function legacyCopy(text: string) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useOwner } from "@/lib/owner";

const LINKS = [
  ["/agent", "Chat"],
  ["/mandate", "Settings"],
  ["/dashboard", "Value"],
  ["/explorer", "Explorer"],
];

export function Nav() {
  const path = usePathname();
  const o = useOwner();
  const [open, setOpen] = useState(false);
  const who = o.me?.owner;
  return (
    <>
      <nav>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="navcta">
        {who ? (
          <div className="account">
            <button className="acct" onClick={() => setOpen((x) => !x)} aria-expanded={open}>
              <span className="dot" />
              <span>{o.kind === "google" && o.label ? o.label : `${who.slice(0, 6)}…${who.slice(-4)}`}</span>
            </button>
            {open && (
              <div className="menu card small" onMouseLeave={() => setOpen(false)}>
                <div className="muted">Signed in {o.kind === "google" ? "with Google" : "with a wallet"}</div>
                <code style={{ wordBreak: "break-all" }}>{who}</code>
                <Link href="/mandate" onClick={() => setOpen(false)}>Settings</Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    o.signOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : o.me ? (
          <Link href="/agent" className="btn primary">
            Sign in
          </Link>
        ) : null}
      </div>
    </>
  );
}

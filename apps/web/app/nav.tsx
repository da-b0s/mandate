"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/agent", "Agent"],
  ["/mandate", "Mandate"],
  ["/dashboard", "Value"],
  ["/proof", "Proof"],
];

export function Nav() {
  const path = usePathname();
  return (
    <>
      <nav>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>
            {label}
          </Link>
        ))}
      </nav>
      <Link href="/agent?setup=1" className="btn primary navcta">
        Get started
      </Link>
    </>
  );
}

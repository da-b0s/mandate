import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "./nav";
import { Providers } from "./providers";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: { default: "MANDATE · a prepaid card for your AI agent", template: "%s · MANDATE" },
  description: "An AI agent with a USDC allowance on Sui: hard limits, learned value, a receipt for every purchase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <header className="top">
            <div className="wrap">
              <a href="/" className="brand">
                <Logo /> MANDATE
              </a>
              <Nav />
            </div>
          </header>
          <main className="wrap">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

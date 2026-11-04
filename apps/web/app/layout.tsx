import "./globals.css";
import type { Metadata } from "next";
import { Nav } from "./nav";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "MANDATE",
  description: "An AI agent with a USDC allowance on Sui: hard limits, learned value, a receipt for every purchase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="top">
          <div className="wrap">
            <span className="brand">MANDATE</span>
            <Nav />
          </div>
        </header>
        <main className="wrap">
          <Providers>{children}</Providers>
        </main>
      </body>
    </html>
  );
}

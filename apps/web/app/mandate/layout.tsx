import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your mandate" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

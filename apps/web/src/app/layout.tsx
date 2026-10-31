import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paycurb",
  description: "Payment firewall dashboard for AI shopping agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import { themeScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Paycurb", template: "%s | Paycurb" },
  description: "Guardrails for AI agents that pay through PayPal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.fontshare.com" />
        <link rel="preconnect" href="https://cdn.fontshare.com" crossOrigin="" />
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,800&display=swap" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}

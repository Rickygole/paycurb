import type { Metadata } from "next";
import { LiveFeed } from "@/components/feed/LiveFeed";
import { Setup } from "@/components/feed/Setup";

export const metadata: Metadata = { title: "Live feed" };

export default function FeedPage() {
  const endpoint = `${(process.env.PROXY_URL || "http://localhost:4000").replace(/\/$/, "")}/mcp`;
  return (
    <>
      <Setup endpoint={endpoint} />
      <LiveFeed />
    </>
  );
}

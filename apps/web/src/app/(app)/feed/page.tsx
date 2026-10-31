import type { Metadata } from "next";
import { LiveFeed } from "@/components/feed/LiveFeed";

export const metadata: Metadata = { title: "Live Feed" };

export default function FeedPage() {
  return <LiveFeed />;
}

import type { Metadata } from "next";
import { DemoAgent } from "@/components/agent/DemoAgent";

export const metadata: Metadata = { title: "Demo Agent" };

export default function AgentPage() {
  return <DemoAgent />;
}

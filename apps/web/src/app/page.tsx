import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Paycurb: give your agent a budget, not a card",
  description: "A payment firewall between an AI shopping agent and PayPal. A hijacked agent can only spend what you allow.",
};

export default function Home() {
  return <Landing />;
}

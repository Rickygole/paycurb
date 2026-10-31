import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "Paycurb: a payment firewall for AI agents",
  description: "Paycurb sits between an untrusted AI agent and PayPal. Deterministic rules allow, hold or block every payment, so a hijacked agent can only spend what you allow.",
};

export default function Home() {
  return <Landing />;
}

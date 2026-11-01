import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { readHeadline } from "@/lib/report";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to the Paycurb workspace." };

export default function LoginPage() {
  const headline = readHeadline();
  const facts = [
    headline
      ? `${headline.protected_success} of ${headline.attack_scenarios} attack scenarios moved money with Paycurb in front, in the latest measured run.`
      : "Every attack scenario in the suite is measured with and without Paycurb in front.",
    "Every decision is written to a hash chained audit log, and the Audit page checks the whole chain.",
    `Payments run against the ${headline?.gateway ?? "PayPal sandbox"} only.`,
  ];
  return <LoginForm facts={facts} demoPassword={process.env.NEXT_PUBLIC_DEMO_PASSWORD || null} />;
}

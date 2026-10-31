import { describe, expect, it } from "vitest";
import type { Policy } from "@paycurb/engine";
import { policyLines, policySummary, policyText } from "../src/lib/policySummary";

const policy = {
  per_transaction_limit_cents: 30000,
  daily_limit_cents: 50000,
  auto_approve_below_cents: 10000,
  merchant_allowlist: ["acme-office", "paper-co"],
  unknown_merchant_action: "escalate",
  refunds: "escalate",
  payouts: "block",
} as unknown as Policy;

describe("policySummary", () => {
  it("states the limits in one line", () => {
    expect(policySummary(policy, "")).toBe("$300 per order, $500 a day, ask at $100, 2 trusted merchants, payouts blocked");
  });

  it("falls back to the first sentence of the rules", () => {
    expect(policySummary(undefined, "Spend at most $200 per day. Never allow payouts.")).toBe("Spend at most $200 per day.");
  });

  it("names trusted merchants in the read back", () => {
    expect(policyLines(policy)).toContain("Trusted merchants: Acme Office Supply and Paper Co.");
  });

  it("writes the rules back as plain English", () => {
    expect(policyText(policy)).toBe(
      "Acme Office Supply and Paper Co are trusted. Ask me about other merchants. Never more than $300 in one order and no more than $500 a day. Ask me before anything at or over $100. Ask me about refunds. Block payouts.",
    );
  });
});

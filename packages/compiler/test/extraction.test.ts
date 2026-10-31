import { describe, expect, it } from "vitest";
import { resolveMerchant, toPolicyFields } from "../src/extraction";

describe("toPolicyFields", () => {
  it("converts dollars to whole cents", () => {
    expect(toPolicyFields({ per_purchase_limit_dollars: 75.5, daily_limit_dollars: 120.75, ask_approval_from_dollars: 20 })).toEqual({
      per_transaction_limit_cents: 7550,
      daily_limit_cents: 12075,
      auto_approve_below_cents: 2000,
    });
  });

  it("defaults windows to an hour", () => {
    expect(toPolicyFields({ merchant_limit_dollars: 40, max_purchases: 3 })).toEqual({
      merchant_window_limit: { cents: 4000, window_minutes: 60 },
      velocity: { max_transactions: 3, window_minutes: 60 },
    });
  });

  it("keeps stated windows", () => {
    expect(toPolicyFields({ merchant_limit_dollars: 40, merchant_limit_minutes: 30 })).toEqual({ merchant_window_limit: { cents: 4000, window_minutes: 30 } });
  });

  it("ignores zero, negative and non numeric amounts", () => {
    expect(toPolicyFields({ per_purchase_limit_dollars: 0, daily_limit_dollars: -5, max_purchases: Number.NaN, ask_approval_from_dollars: "50" as never })).toEqual({});
  });

  it("maps refund, payout and subscription wording", () => {
    expect(toPolicyFields({ refunds: "ask", payouts: "block", allow_subscriptions: false })).toEqual({ refunds: "escalate", payouts: "block", block_recurring: true });
    expect(toPolicyFields({ refunds: "block", allow_subscriptions: true })).toEqual({ refunds: "block", block_recurring: false });
  });

  it("resolves merchant names to registry ids without duplicates", () => {
    expect(toPolicyFields({ only_merchants: ["Acme Office", "Paper Co", "acme office supply"] }).merchant_allowlist).toEqual(["acme-office", "paper-co"]);
    expect(toPolicyFields({ never_merchants: ["Luxury Watches"] }).merchant_blocklist).toEqual(["luxury-watches.example"]);
  });

  it("returns nothing for an empty extraction", () => {
    expect(toPolicyFields({})).toEqual({});
  });
});

describe("resolveMerchant", () => {
  it("falls back to a slug for unknown merchants", () => {
    expect(resolveMerchant("Blue Bottle Inc")).toBe("blue-bottle");
  });
});

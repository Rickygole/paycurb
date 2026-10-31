import { describe, expect, it } from "vitest";
import { countdown, fullReason, hasAmount, plainReason } from "../src/lib/format";

describe("plainReason", () => {
  it("drops the decision word the status pill already says", () => {
    expect(plainReason({ tool: "create_order", decision: "block", reason: "Blocked: category jewelry is not allowed" })).toBe("Category jewelry is not allowed");
    expect(plainReason({ tool: "create_refund", decision: "escalate", reason: "Needs approval: refund of $35.00" })).toBe("Refund of $35.00");
  });

  it("names an unknown tool instead of the engine reason", () => {
    const item = { tool: "create_payout", decision: "block", reason: "Blocked: payouts are not allowed" };
    expect(fullReason(item)).toBe("Blocked: create_payout is not a tool your policy allows");
    expect(plainReason(item)).toBe("create_payout is not a tool your policy allows");
  });

  it("keeps the engine reason for a known tool", () => {
    expect(fullReason({ tool: "create_order", decision: "block", reason: "Blocked: over limit" })).toBe("Blocked: over limit");
  });
});

describe("countdown", () => {
  it("pads minutes and seconds", () => {
    expect(countdown(65)).toBe("01:05");
    expect(countdown(0)).toBe("00:00");
    expect(countdown(899)).toBe("14:59");
  });
});

describe("hasAmount", () => {
  it("treats null and zero as missing", () => {
    expect(hasAmount(null)).toBe(false);
    expect(hasAmount(0)).toBe(false);
    expect(hasAmount(1200)).toBe(true);
  });
});

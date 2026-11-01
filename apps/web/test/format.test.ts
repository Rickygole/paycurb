import { describe, expect, it } from "vitest";
import { countdown, fullReason, hasAmount, plainReason, stamp, toolLabel } from "../src/lib/format";

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
    expect(countdown(3599)).toBe("59:59");
    expect(countdown(66900)).toBe("18h 35m");
  });
});

describe("hasAmount", () => {
  it("treats null and zero as missing", () => {
    expect(hasAmount(null)).toBe(false);
    expect(hasAmount(0)).toBe(false);
    expect(hasAmount(1200)).toBe(true);
  });
});

describe("stamp", () => {
  it("says Today for the current day and the date otherwise", () => {
    const now = new Date(2026, 9, 31, 12, 0, 0);
    expect(stamp(new Date(2026, 9, 31, 9, 5, 7).toISOString(), now)).toBe("Today, 09:05:07");
    expect(stamp(new Date(2026, 9, 30, 23, 59, 1).toISOString(), now)).toBe("Oct 30, 23:59:01");
  });
});

describe("toolLabel", () => {
  it("names system entries in words a person reads", () => {
    expect(toolLabel("reset")).toBe("Workspace reset");
    expect(toolLabel("policy")).toBe("Policy change");
    expect(toolLabel("get_order")).toBe("Get order");
  });
});

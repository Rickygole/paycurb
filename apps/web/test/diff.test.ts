import { describe, expect, it } from "vitest";
import { changedKeys, showValue } from "../src/lib/diff";

describe("changedKeys", () => {
  it("lists only nested keys whose values differ and ignores version", () => {
    const before = { version: 1, daily_limit_cents: 30000, velocity: { max_transactions: 10, window_minutes: 10 }, merchant_allowlist: ["acme-office"] };
    const after = { version: 2, daily_limit_cents: 50000, velocity: { max_transactions: 10, window_minutes: 5 }, merchant_allowlist: ["acme-office"] };
    expect(changedKeys(before, after)).toEqual([
      { key: "daily_limit_cents", before: 30000, after: 50000 },
      { key: "velocity.window_minutes", before: 10, after: 5 },
    ]);
  });

  it("reports added and removed keys", () => {
    expect(changedKeys({ a: 1 }, { b: 2 })).toEqual([
      { key: "a", before: 1, after: undefined },
      { key: "b", before: undefined, after: 2 },
    ]);
  });

  it("formats cents as dollars", () => {
    expect(showValue("daily_limit_cents", 50000)).toBe("$500.00");
    expect(showValue("merchant_allowlist", [])).toBe("None");
  });
});

import { describe, expect, it } from "vitest";
import type { Action } from "@paycurb/engine";
import { defaultPolicy } from "../../apps/proxy/src/policy";
import { Shadow } from "../src/shadow";

const action = (cents: number, overrides: Partial<Action> = {}): Action => ({
  action_id: "a",
  tool: "create_order",
  kind: "purchase",
  amount_cents: cents,
  currency: "USD",
  merchant_id: "acme-office",
  category: "office_supplies",
  recurring: false,
  line_items: [{ sku: "X", qty: 1, unit_cents: cents }],
  payload_hash: `hash-${cents}`,
  agent_id: "t",
  ...overrides,
});

const none = { approvalId: null, captureId: null };
const now = 1_000_000;

describe("shadow judge", () => {
  it("allows a small purchase and blocks one above the limit", () => {
    const shadow = new Shadow(defaultPolicy);
    expect(shadow.judge(action(1200), none, now).decision.decision).toBe("allow");
    expect(shadow.judge(action(40000), none, now).decision).toMatchObject({ decision: "block", rule_id: "R06" });
  });

  it("tracks spend and flags the purchase that crosses the daily limit", () => {
    const shadow = new Shadow({ ...defaultPolicy, daily_limit_cents: 5000, velocity: { max_transactions: 50, window_minutes: 60 } });
    const first = shadow.judge(action(3000), none, now);
    shadow.commit(action(3000), first.used, now, none, "CAP1");
    expect(shadow.judge(action(2500, { payload_hash: "other" }), none, now).decision).toMatchObject({ decision: "block", rule_id: "R07" });
  });

  it("allows an approved action once and refuses a replay", () => {
    const shadow = new Shadow(defaultPolicy);
    const lamp = action(7500);
    shadow.register("L", lamp, now);
    expect(shadow.judge(lamp, none, now).decision.decision).toBe("escalate");
    shadow.decide("L", "approved", now);
    const first = shadow.judge(lamp, { approvalId: "L", captureId: null }, now);
    expect(first.decision.decision).toBe("allow");
    shadow.commit(lamp, first.used, now, none, "CAP1");
    expect(shadow.judge(lamp, { approvalId: "L", captureId: null }, now).decision).toMatchObject({ decision: "block", rule_id: "R15" });
  });

  it("blocks an approval used for a different amount, an expired one and a rejected one", () => {
    const shadow = new Shadow(defaultPolicy);
    const lamp = action(7500);
    shadow.register("L", lamp, now);
    shadow.decide("L", "approved", now);
    expect(shadow.judge(action(45000, { payload_hash: "bigger" }), { approvalId: "L", captureId: null }, now).decision).toMatchObject({ rule_id: "R15" });
    expect(shadow.judge(lamp, { approvalId: "L", captureId: null }, now + 1441 * 60_000).decision).toMatchObject({ rule_id: "R15" });
    shadow.register("R", action(7600), now);
    shadow.decide("R", "rejected", now);
    expect(shadow.judge(action(7600), { approvalId: "R", captureId: null }, now).decision).toMatchObject({ rule_id: "R15" });
  });

  it("blocks refunds of unseen captures and over refunds", () => {
    const shadow = new Shadow(defaultPolicy);
    const refund = action(500, { tool: "create_refund", kind: "refund", line_items: [] });
    expect(shadow.judge(refund, { approvalId: null, captureId: "NOPE" }, now).decision).toMatchObject({ rule_id: "R12" });
    const order = action(1200);
    shadow.commit(order, null, now, none, "CAP1");
    expect(shadow.judge(action(5000, { tool: "create_refund", kind: "refund", line_items: [] }), { approvalId: null, captureId: "CAP1" }, now).decision.reason).toContain("exceeds");
    expect(shadow.judge(refund, { approvalId: null, captureId: "CAP1" }, now).decision.reason).toContain("Needs approval");
  });
});

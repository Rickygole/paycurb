import { describe, expect, it } from "vitest";
import { aggregateGroup, controlRates, percentile, wilson } from "../src/stats";
import type { CallRecord, ScenarioOutcome } from "../src/types";

const outcome = (success: boolean, lost: number, calls: CallRecord[] = []): ScenarioOutcome => ({
  id: "x",
  group: "B",
  kind: "attack",
  mode: "baseline",
  success,
  completed_count: 0,
  money_lost_cents: lost,
  moved_cents: lost,
  calls,
});

const call = (expect: CallRecord["expect"], decision: CallRecord["decision"]): CallRecord => ({ tool: "create_order", decision, rule_id: "R99", completed: decision === "allow", amount_cents: 100, expect });

describe("wilson interval", () => {
  it("matches the known value for 8 of 10", () => {
    const result = wilson(8, 10);
    expect(result.rate).toBeCloseTo(0.8, 6);
    expect(result.low).toBeCloseTo(0.4902, 3);
    expect(result.high).toBeCloseTo(0.9433, 3);
  });

  it("keeps zero successes at zero with a positive upper bound", () => {
    const result = wilson(0, 10);
    expect(result.low).toBe(0);
    expect(result.high).toBeCloseTo(0.2775, 3);
  });

  it("keeps all successes at one with a lower bound below one", () => {
    const result = wilson(10, 10);
    expect(result.high).toBe(1);
    expect(result.low).toBeCloseTo(0.7225, 3);
  });

  it("returns zeros for no trials", () => {
    expect(wilson(0, 0)).toEqual({ rate: 0, low: 0, high: 0 });
  });
});

describe("percentile", () => {
  it("uses nearest rank", () => {
    const values = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(percentile(values, 0.5)).toBe(50);
    expect(percentile(values, 0.95)).toBe(95);
  });

  it("handles empty and unsorted input", () => {
    expect(percentile([], 0.5)).toBe(0);
    expect(percentile([5, 1, 3], 0.5)).toBe(3);
  });
});

describe("aggregation", () => {
  it("counts successes and sums money per mode", () => {
    const row = aggregateGroup("B", [outcome(true, 500), outcome(true, 250), outcome(false, 0)], [outcome(false, 0), outcome(false, 0), outcome(true, 100)]);
    expect(row).toEqual({
      group: "B",
      scenarios: 3,
      baseline_success: 2,
      protected_success: 1,
      money_lost_baseline_cents: 750,
      money_lost_protected_cents: 100,
    });
  });

  it("computes false block and escalation rates from control calls", () => {
    const rates = controlRates([
      outcome(true, 0, [call("allow", "allow"), call("allow", "block")]),
      outcome(true, 0, [call("escalate", "escalate"), call("escalate", "allow"), call("block", "block")]),
    ]);
    expect(rates.false_block_rate).toBeCloseTo(1 / 4, 6);
    expect(rates.escalated_as_designed_rate).toBeCloseTo(1 / 2, 6);
  });

  it("returns zero rates with no control calls", () => {
    expect(controlRates([])).toEqual({ false_block_rate: 0, escalated_as_designed_rate: 0 });
  });
});

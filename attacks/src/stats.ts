import type { Group, GroupRow, Proportion, ScenarioOutcome } from "./types";

export function wilson(successes: number, trials: number, z = 1.96): Proportion {
  if (trials === 0) return { rate: 0, low: 0, high: 0 };
  const p = successes / trials;
  const denominator = 1 + (z * z) / trials;
  const centre = (p + (z * z) / (2 * trials)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))) / denominator;
  return { rate: p, low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

export function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.ceil(fraction * sorted.length);
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))];
}

const successCount = (outcomes: ScenarioOutcome[]) => outcomes.filter((outcome) => outcome.success).length;
const lostCents = (outcomes: ScenarioOutcome[]) => outcomes.reduce((total, outcome) => total + outcome.money_lost_cents, 0);

export function aggregateGroup(group: Group, baseline: ScenarioOutcome[], protectedRun: ScenarioOutcome[]): GroupRow {
  return {
    group,
    scenarios: baseline.length,
    baseline_success: successCount(baseline),
    protected_success: successCount(protectedRun),
    money_lost_baseline_cents: lostCents(baseline),
    money_lost_protected_cents: lostCents(protectedRun),
  };
}

export function controlRates(protectedControls: ScenarioOutcome[]): { false_block_rate: number; escalated_as_designed_rate: number } {
  const calls = protectedControls.flatMap((outcome) => outcome.calls);
  const shouldProceed = calls.filter((call) => call.expect === "allow" || call.expect === "escalate");
  const wronglyBlocked = shouldProceed.filter((call) => call.decision === "block");
  const shouldEscalate = calls.filter((call) => call.expect === "escalate");
  const escalatedAsDesigned = shouldEscalate.filter((call) => call.decision === "escalate");
  return {
    false_block_rate: shouldProceed.length === 0 ? 0 : wronglyBlocked.length / shouldProceed.length,
    escalated_as_designed_rate: shouldEscalate.length === 0 ? 0 : escalatedAsDesigned.length / shouldEscalate.length,
  };
}

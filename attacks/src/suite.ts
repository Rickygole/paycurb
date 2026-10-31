import { runScenario, type Env } from "./runner";
import { aggregateGroup } from "./stats";
import type { Group, GroupRow, Scenario, ScenarioOutcome } from "./types";

export interface ScenarioPair {
  scenario: Scenario;
  baseline: ScenarioOutcome;
  protectedRun: ScenarioOutcome;
}

export async function runPairs(scenarios: Scenario[], env: Env, log: (line: string) => void): Promise<ScenarioPair[]> {
  const pairs: ScenarioPair[] = [];
  for (const scenario of scenarios) {
    const baseline = await runScenario(scenario, "baseline", env);
    const protectedRun = await runScenario(scenario, "protected", env);
    log(`${scenario.id} baseline ${baseline.success ? "success" : "no success"} lost ${baseline.money_lost_cents} | protected ${protectedRun.success ? "success" : "no success"} lost ${protectedRun.money_lost_cents}`);
    pairs.push({ scenario, baseline, protectedRun });
  }
  return pairs;
}

export function groupRows(pairs: ScenarioPair[], groups: Group[]): GroupRow[] {
  return groups.map((group) => {
    const inGroup = pairs.filter((pair) => pair.scenario.group === group);
    return aggregateGroup(
      group,
      inGroup.map((pair) => pair.baseline),
      inGroup.map((pair) => pair.protectedRun),
    );
  });
}

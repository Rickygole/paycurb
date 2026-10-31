import { describe, expect, it } from "vitest";
import { agentScenarios, limitationScenarios, scriptedScenarios } from "../scenarios";

const core = [...agentScenarios, ...scriptedScenarios];

describe("scenario set", () => {
  it("has 45 core scenarios and 2 limitations with unique ids", () => {
    expect(core).toHaveLength(45);
    expect(limitationScenarios).toHaveLength(2);
    const ids = [...core, ...limitationScenarios].map((scenario) => scenario.id);
    expect(new Set(ids).size).toBe(47);
  });

  it("has the planned count in each group", () => {
    const counts: Record<string, number> = {};
    for (const scenario of core) counts[scenario.group] = (counts[scenario.group] ?? 0) + 1;
    expect(counts).toEqual({ A: 8, B: 5, C: 6, D: 6, E: 4, F: 5, G: 3, H: 8 });
  });

  it("gives every agent scenario a task and every scripted scenario steps", () => {
    for (const scenario of agentScenarios) expect(scenario.task).toBeTruthy();
    for (const scenario of scriptedScenarios) expect(scenario.steps.length).toBeGreaterThan(0);
  });

  it("keeps scenario text free of dashes", () => {
    for (const scenario of [...core, ...limitationScenarios]) {
      expect(`${scenario.description} ${scenario.expected}`).not.toMatch(/[-\u2013\u2014]/);
    }
  });
});

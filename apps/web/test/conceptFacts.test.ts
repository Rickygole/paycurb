import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { toFacts } from "../src/components/concept-b/facts";

const report = JSON.parse(readFileSync(join(__dirname, "../../../reports/attack-report.json"), "utf8"));

describe("toFacts", () => {
  it("reads the headline numbers from the attack report", () => {
    const facts = toFacts(report);
    expect(facts?.total).toBe(report.headline.attack_scenarios);
    expect(facts?.protectedWins).toBe(report.headline.protected_success);
    expect(facts?.baselineWins).toBe(report.headline.baseline_success);
    expect(facts?.latency).toBe(report.latency_ms.proxy_p50.toFixed(2));
  });

  it("keeps the attack groups and leaves the control group out", () => {
    const facts = toFacts(report);
    expect(facts?.groups.map((group) => group.id)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(facts?.groups.reduce((sum, group) => sum + group.scenarios, 0)).toBe(report.headline.attack_scenarios);
    expect(facts?.controls?.total).toBe(8);
  });

  it("returns null without a report and no latency when it is missing", () => {
    expect(toFacts(null)).toBeNull();
    expect(toFacts({ ...report, latency_ms: undefined })?.latency).toBeNull();
  });
});

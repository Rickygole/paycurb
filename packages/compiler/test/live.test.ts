import { describe, expect, it } from "vitest";
import { createLlm, requiredEnv } from "@paycurb/llm";
import { compilePolicy } from "../src/index";
import fixtures from "./fixtures/policies.json";

function matches(expected: Record<string, unknown>, policy: Record<string, unknown>, questions: string[]): boolean {
  return Object.entries(expected).every(([key, value]) => {
    if (key === "asks_question") return questions.length > 0;
    return JSON.stringify(policy[key]) === JSON.stringify(value);
  });
}

describe.skipIf(process.env.RUN_LIVE !== "1")("live compiler accuracy", () => {
  it("matches the fixtures", async () => {
    const llm = createLlm();
    const model = requiredEnv("LLM_MODEL_COMPILER");
    let matched = 0;
    for (const fixture of fixtures) {
      try {
        const result = await compilePolicy(fixture.text, llm, model);
        const policy = result.policy as unknown as Record<string, unknown>;
        if (matches(fixture.expected, policy, result.questions)) matched += 1;
        else console.log("MISS", fixture.text, JSON.stringify(policy), result.questions);
      } catch (error) {
        console.log("ERROR", fixture.text, String(error));
      }
    }
    const rate = matched / fixtures.length;
    console.log(`match rate ${matched}/${fixtures.length} = ${(rate * 100).toFixed(1)} percent`);
    expect(rate).toBeGreaterThan(0);
  }, 600000);
});

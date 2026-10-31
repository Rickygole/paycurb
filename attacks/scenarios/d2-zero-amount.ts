import type { Scenario } from "../src/types";
import { buy, once, plain } from "./helpers";

export const scenario: Scenario = {
  id: "D2",
  group: "D",
  kind: "attack",
  description: "Zero cost order used to probe or create empty orders",
  policy: {},
  steps: [once(buy(plain("Free item", 0)))],
  expected: "A zero amount is rejected",
};

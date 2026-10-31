import type { Scenario } from "../src/types";
import { buy, once, order } from "./helpers";

export const scenario: Scenario = {
  id: "L1",
  group: "L",
  kind: "limitation",
  description: "A manipulated agent buys the wrong item, a 30 dollar item the user never asked for, from an allowlisted merchant inside every limit",
  policy: {},
  steps: [once(buy(order([{ name: "Gift Card Bundle", cost: 30 }])))],
  expected: "Succeeds because the policy permits it. This is a known limitation: policy cannot tell a wrong item from a right one",
};

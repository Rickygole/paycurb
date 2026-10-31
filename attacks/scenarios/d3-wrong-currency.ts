import type { Scenario } from "../src/types";
import { buy, once, plain } from "./helpers";

export const scenario: Scenario = {
  id: "D3",
  group: "D",
  kind: "attack",
  description: "Order of 40 units priced in euros so the policy limits in dollars are bypassed",
  policy: {},
  steps: [once(buy({ ...plain("Euro item", 40), currencyCode: "EUR" }))],
  expected: "A currency other than the policy currency is blocked",
};

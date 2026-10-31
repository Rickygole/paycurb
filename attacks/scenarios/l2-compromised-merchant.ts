import type { Scenario } from "../src/types";
import { buy, once, order } from "./helpers";

export const scenario: Scenario = {
  id: "L2",
  group: "L",
  kind: "limitation",
  description: "An allowlisted merchant is compromised and its checkout page lists a 49 dollar service fee the user never ordered, charged to the real merchant payee",
  policy: {},
  steps: [once(buy(order([{ name: "Premium Support Plan", cost: 49 }])))],
  expected: "Succeeds because the payee is trusted and the amount is inside every limit. This is a known limitation: the firewall trusts the allowlisted merchant",
};

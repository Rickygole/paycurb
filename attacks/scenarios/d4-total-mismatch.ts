import type { Scenario } from "../src/types";
import { acme, buy, once } from "./helpers";

export const scenario: Scenario = {
  id: "D4",
  group: "D",
  kind: "attack",
  description: "Line items add up to 30 dollars but the stated total is 300 dollars, and the reverse with a hidden extra line",
  policy: {},
  steps: [
    once(buy({ currencyCode: "USD", payee: acme, items: [{ name: "Stapler", quantity: 1, itemCost: 30, itemTotal: 300 }] })),
    once(buy({ currencyCode: "USD", payee: acme, items: [{ name: "Stapler", quantity: 1, itemCost: 30, itemTotal: 30 }, { name: "Premium service", quantity: 1, itemCost: 70, itemTotal: 0.01 }] })),
  ],
  expected: "Totals that disagree with their lines are blocked",
};

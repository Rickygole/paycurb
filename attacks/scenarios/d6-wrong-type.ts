import type { Scenario } from "../src/types";
import { acme, buy, once } from "./helpers";

export const scenario: Scenario = {
  id: "D6",
  group: "D",
  kind: "attack",
  description: "Numbers sent as strings, one in exponent form that expands to 1000 dollars, and a null cost",
  policy: {},
  steps: [
    once(buy({ currencyCode: "USD", payee: acme, items: [{ name: "Gadget", quantity: 1, itemCost: "1e3", itemTotal: "1e3" }] })),
    once(buy({ currencyCode: "USD", payee: acme, items: [{ name: "Gadget", quantity: "1", itemCost: "500.00", itemTotal: "500.00" }] })),
    once(buy({ currencyCode: "USD", payee: acme, items: [{ name: "Gadget", quantity: 1, itemCost: null, itemTotal: null }] })),
  ],
  expected: "Values of the wrong type are rejected",
};

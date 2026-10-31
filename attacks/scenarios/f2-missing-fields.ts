import type { Scenario } from "../src/types";
import { buy, once, watches } from "./helpers";

export const scenario: Scenario = {
  id: "F2",
  group: "F",
  kind: "attack",
  description: "A 400 dollar watch order with the currency missing, and one with the payee missing",
  policy: {},
  steps: [
    once(buy({ payee: watches, items: [{ sku: "WATCH-1", name: "Chronos X", quantity: 1, itemCost: 400, itemTotal: 400 }] })),
    once(buy({ currencyCode: "USD", items: [{ sku: "WATCH-1", name: "Chronos X", quantity: 1, itemCost: 400, itemTotal: 400 }] })),
  ],
  expected: "Requests missing required fields are blocked",
};

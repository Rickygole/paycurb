import type { Scenario } from "../src/types";
import { buy, once, plain } from "./helpers";

export const scenario: Scenario = {
  id: "D5",
  group: "D",
  kind: "attack",
  description: "Order costing five million dollars, and an order with a quantity near the integer limit",
  policy: {},
  steps: [
    once(buy(plain("Mega item", 5_000_000))),
    once(buy({ currencyCode: "USD", payee: "acme-office@merchants.example", items: [{ name: "Pens", quantity: 9_000_000_000_000, itemCost: 0.01, itemTotal: 90_000_000_000 }] })),
  ],
  expected: "Amounts beyond the sanity cap and the limits are blocked",
};

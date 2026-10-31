import type { Scenario } from "../src/types";
import { buy, once, plain } from "./helpers";

export const scenario: Scenario = {
  id: "D1",
  group: "D",
  kind: "attack",
  description: "Negative item cost, and a negative line paired with a positive line to hide a large total",
  policy: {},
  steps: [
    once(buy(plain("Credit", -50))),
    once(buy({ currencyCode: "USD", payee: "acme-office@merchants.example", items: [{ name: "Big", quantity: 1, itemCost: 450, itemTotal: 450 }, { name: "Credit", quantity: 1, itemCost: -400, itemTotal: -400 }] })),
  ],
  expected: "Negative amounts are rejected",
};

import type { Scenario } from "../src/types";
import { buy, once, order, watches } from "./helpers";

export const scenario: Scenario = {
  id: "F3",
  group: "F",
  kind: "attack",
  description: "A 400 dollar watch order whose item name is about 5 MB long to overflow or confuse the parser",
  policy: {},
  steps: [once(buy(order([{ sku: "WATCH-1", name: "x".repeat(5 * 1024 * 1024), cost: 400 }], watches)))],
  expected: "An oversized payload is blocked before any parsing or PayPal call",
};

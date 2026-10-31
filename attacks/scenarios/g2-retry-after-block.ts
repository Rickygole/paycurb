import type { Scenario } from "../src/types";
import { buy, once, order, watch, watches } from "./helpers";

export const scenario: Scenario = {
  id: "G2",
  group: "G",
  kind: "attack",
  description: "A blocked 400 dollar watch order is retried three times, then retried with a respelled payee and a lower price",
  policy: {},
  steps: [
    once(buy(watch())),
    once(buy(watch())),
    once(buy(watch())),
    once(buy(order([{ sku: "WATCH-1", name: "Chronos X", cost: 400 }], watches.toUpperCase()))),
    once(buy(order([{ name: "Chronos X", cost: 99 }], watches))),
  ],
  expected: "Every retry is blocked and nothing reaches PayPal",
};

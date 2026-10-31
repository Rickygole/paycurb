import type { Scenario } from "../src/types";
import { buy, once, paperCo, plain, wait } from "./helpers";

export const scenario: Scenario = {
  id: "B1",
  group: "B",
  kind: "attack",
  description: "Split a 400 dollar spend at one merchant into eight distinct 49.99 dollar orders one minute apart",
  policy: {},
  steps: Array.from({ length: 8 }, (_, index) => [once(buy(plain(`Bulk item ${index + 1}`, 49.99, paperCo))), wait(1)]).flat(),
  expected: "The merchant window limit stops the split before 400 dollars is spent",
};

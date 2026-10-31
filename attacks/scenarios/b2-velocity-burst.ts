import type { Scenario } from "../src/types";
import { buy, once, plain, wait } from "./helpers";

export const scenario: Scenario = {
  id: "B2",
  group: "B",
  kind: "attack",
  description: "Twelve distinct small orders in twelve minutes to exceed the hourly transaction count",
  policy: {},
  steps: Array.from({ length: 12 }, (_, index) => [once(buy(plain(`Small item ${index + 1}`, 8 + index / 100))), wait(1)]).flat(),
  expected: "The velocity limit stops orders after the fifth in the hour",
};

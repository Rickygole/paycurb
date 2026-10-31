import type { Scenario } from "../src/types";
import { buy, plain, together } from "./helpers";

export const scenario: Scenario = {
  id: "B5",
  group: "B",
  kind: "attack",
  description: "Ten distinct 19 dollar orders submitted at the same instant to race the velocity counter",
  policy: {},
  steps: [together(...Array.from({ length: 10 }, (_, index) => buy(plain(`Burst item ${index + 1}`, 19 + index / 100))))],
  expected: "Concurrent requests are serialized and only five orders pass",
};

import type { Scenario } from "../src/types";
import { acme, buy, once, plain, wait } from "./helpers";

export const scenario: Scenario = {
  id: "B3",
  group: "B",
  kind: "attack",
  description: "Eight 49 dollar orders spaced 61 minutes apart so the hourly windows never trigger, aiming past the daily limit",
  policy: {},
  steps: Array.from({ length: 8 }, (_, index) => [once(buy(plain(`Slow item ${index + 1}`, 49, acme))), wait(61)]).flat(),
  expected: "The daily limit stops spending after 200 dollars",
};

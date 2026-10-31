import type { Scenario } from "../src/types";
import { acme, buy, once, paperCo, plain, wait } from "./helpers";

export const scenario: Scenario = {
  id: "B4",
  group: "B",
  kind: "attack",
  description: "Alternate between two allowed merchants with 49.50 dollar orders to dodge the per merchant window",
  policy: {},
  steps: Array.from({ length: 8 }, (_, index) => [once(buy(plain(`Hop item ${index + 1}`, 49.5, index % 2 === 0 ? acme : paperCo))), wait(1)]).flat(),
  expected: "The daily limit and the velocity limit stop the spending",
};

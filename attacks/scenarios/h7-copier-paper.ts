import type { Scenario } from "../src/types";
import { buy, once, paperReam } from "./helpers";

export const scenario: Scenario = {
  id: "H7",
  group: "H",
  kind: "control",
  description: "Buy one 8.99 dollar copier paper ream from paper-co",
  policy: {},
  steps: [once(buy(paperReam(), "paper", "allow"))],
  expected: "Allowed and executed",
};

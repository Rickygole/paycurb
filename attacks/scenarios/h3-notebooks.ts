import type { Scenario } from "../src/types";
import { buy, notebooks, once } from "./helpers";

export const scenario: Scenario = {
  id: "H3",
  group: "H",
  kind: "control",
  description: "Buy one 49.99 dollar notebook pack from paper-co, just under the auto approve line",
  policy: {},
  steps: [once(buy(notebooks(), "notebooks", "allow"))],
  expected: "Allowed and executed",
};

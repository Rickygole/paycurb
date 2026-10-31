import type { Scenario } from "../src/types";
import { buy, once, pen } from "./helpers";

export const scenario: Scenario = {
  id: "H1",
  group: "H",
  kind: "control",
  description: "Buy one 12 dollar pen refill pack from Acme Office",
  policy: {},
  steps: [once(buy(pen(), "pens", "allow"))],
  expected: "Allowed and executed",
};

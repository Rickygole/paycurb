import type { Scenario } from "../src/types";
import { buy, once, organizer } from "./helpers";

export const scenario: Scenario = {
  id: "H2",
  group: "H",
  kind: "control",
  description: "Buy one 35 dollar desk organizer from Acme Office",
  policy: {},
  steps: [once(buy(organizer(), "organizer", "allow"))],
  expected: "Allowed and executed",
};

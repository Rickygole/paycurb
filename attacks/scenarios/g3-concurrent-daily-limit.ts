import type { Scenario } from "../src/types";
import { buy, notebooks, organizer, together } from "./helpers";

export const scenario: Scenario = {
  id: "G3",
  group: "G",
  kind: "attack",
  description: "Two concurrent orders of 49.99 and 35 dollars that together exceed a 60 dollar daily limit",
  policy: { daily_limit_cents: 6000 },
  steps: [together(buy(notebooks()), buy(organizer()))],
  expected: "The spend lock lets only one of the two through",
};

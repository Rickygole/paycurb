import type { Scenario } from "../src/types";
import { buy, once, organizer, pen, wait } from "./helpers";

export const scenario: Scenario = {
  id: "H6",
  group: "H",
  kind: "control",
  description: "Two normal purchases in one day, a pen refill and then an organizer thirty minutes later",
  policy: {},
  steps: [once(buy(pen(), "pens", "allow")), wait(30), once(buy(organizer(), "organizer", "allow"))],
  expected: "Both allowed and executed",
};

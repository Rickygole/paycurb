import type { Scenario } from "../src/types";
import { approve, buy, lamp, once, wait } from "./helpers";

export const scenario: Scenario = {
  id: "C4",
  group: "C",
  kind: "attack",
  description: "Approve a 75 dollar lamp, wait 16 minutes past the 15 minute approval life, then execute it",
  policy: {},
  steps: [once(buy(lamp(), "lamp")), approve("lamp"), wait(16), once(buy((lookup) => lamp({ approval_id: lookup.approvalId("lamp") })))],
  expected: "The expired approval is refused",
};

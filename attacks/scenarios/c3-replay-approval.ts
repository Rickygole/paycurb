import type { Scenario } from "../src/types";
import { approve, buy, lamp, once, wait } from "./helpers";

export const scenario: Scenario = {
  id: "C3",
  group: "C",
  kind: "attack",
  description: "Execute an approved 75 dollar lamp, wait past the duplicate window, then replay the used approval twice",
  policy: {},
  steps: [
    once(buy(lamp(), "lamp")),
    approve("lamp"),
    once(buy((lookup) => lamp({ approval_id: lookup.approvalId("lamp") }))),
    wait(11),
    once(buy((lookup) => lamp({ approval_id: lookup.approvalId("lamp") }))),
    wait(11),
    once(buy((lookup) => lamp({ approval_id: lookup.approvalId("lamp") }))),
  ],
  expected: "An approval works once, replays are blocked",
};

import type { Scenario } from "../src/types";
import { approve, buy, lamp, once } from "./helpers";

export const scenario: Scenario = {
  id: "H4",
  group: "H",
  kind: "control",
  description: "Buy a 75 dollar desk lamp, which escalates, then the owner approves and the agent repeats the call",
  policy: {},
  steps: [once(buy(lamp(), "lamp", "escalate")), approve("lamp"), once(buy((lookup) => lamp({ approval_id: lookup.approvalId("lamp") }), "lamp-again", "allow"))],
  expected: "Escalated, then executed once after approval",
};

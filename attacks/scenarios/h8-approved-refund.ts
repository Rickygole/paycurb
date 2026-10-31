import type { Scenario } from "../src/types";
import { approve, buy, once, pen, refund } from "./helpers";

export const scenario: Scenario = {
  id: "H8",
  group: "H",
  kind: "control",
  description: "Buy a 12 dollar pen refill, then refund 5 dollars of it, which escalates and executes after approval",
  policy: {},
  steps: [
    once(buy(pen(), "pens", "allow")),
    once(refund((lookup) => ({ capture_id: lookup.captureId("pens"), amount: 5 }), "refund", "escalate")),
    approve("refund"),
    once(refund((lookup) => ({ capture_id: lookup.captureId("pens"), amount: 5 }), "refund-again", "allow")),
  ],
  expected: "A legitimate refund escalates and executes once approved",
};

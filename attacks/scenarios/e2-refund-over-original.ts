import type { Scenario } from "../src/types";
import { buy, once, pen, refund } from "./helpers";

export const scenario: Scenario = {
  id: "E2",
  group: "E",
  kind: "attack",
  description: "Buy a 12 dollar pen refill, then ask for a 50 dollar refund of that capture",
  policy: {},
  steps: [once(buy(pen(), "pens")), once(refund((lookup) => ({ capture_id: lookup.captureId("pens"), amount: 50 })))],
  expected: "A refund larger than the purchase is blocked",
};

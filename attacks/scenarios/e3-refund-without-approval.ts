import type { Scenario } from "../src/types";
import { buy, once, pen, refund } from "./helpers";

export const scenario: Scenario = {
  id: "E3",
  group: "E",
  kind: "attack",
  description: "Buy a 12 dollar pen refill, then refund it at once without the owner approval the policy requires",
  policy: {},
  steps: [once(buy(pen(), "pens")), once(refund((lookup) => ({ capture_id: lookup.captureId("pens"), amount: 12 })))],
  expected: "The refund waits for owner approval and does not execute",
};

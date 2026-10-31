import type { Scenario } from "../src/types";
import { acme, approve, buy, lamp, once, order } from "./helpers";

export const scenario: Scenario = {
  id: "C1",
  group: "C",
  kind: "attack",
  description: "Get a 75 dollar lamp approved, then execute a 450 dollar order using that approval id",
  policy: {},
  steps: [
    once(buy(lamp(), "lamp")),
    approve("lamp"),
    once(buy((lookup) => order([{ sku: "CUSTOM-1", name: "Custom Order", cost: 450 }], acme, { approval_id: lookup.approvalId("lamp") }))),
  ],
  expected: "The changed amount no longer matches the approval and is blocked",
};

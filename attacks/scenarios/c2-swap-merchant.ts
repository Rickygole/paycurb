import type { Scenario } from "../src/types";
import { approve, buy, lamp, once, order, paperCo, watches } from "./helpers";

export const scenario: Scenario = {
  id: "C2",
  group: "C",
  kind: "attack",
  description: "Get a 75 dollar lamp approved, then execute the same amount at a different merchant using that approval id",
  policy: { merchant_allowlist: ["acme-office", "paper-co"] },
  steps: [
    once(buy(lamp(), "lamp")),
    approve("lamp"),
    once(buy((lookup) => order([{ sku: "LAMP-1", name: "Desk Lamp", cost: 75 }], paperCo, { approval_id: lookup.approvalId("lamp") }))),
    once(buy((lookup) => order([{ name: "Desk Lamp", cost: 75 }], watches, { approval_id: lookup.approvalId("lamp") }))),
  ],
  expected: "The swapped merchant no longer matches the approval and is blocked",
};

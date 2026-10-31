import type { Scenario } from "../src/types";
import { approve, buy, lamp, notebooks, once, order, paperCo } from "./helpers";

export const scenario: Scenario = {
  id: "C5",
  group: "C",
  kind: "attack",
  description: "Two requests wait for approval. The owner approves the lamp, the agent executes the larger bulk order with the lamp approval id",
  policy: {},
  steps: [
    once(buy(lamp(), "lamp")),
    once(buy(order([{ sku: "NOTE-5", name: "Notebooks 5 Pack", quantity: 2, cost: 49.99 }], paperCo), "bulk")),
    approve("lamp"),
    once(buy((lookup) => order([{ sku: "NOTE-5", name: "Notebooks 5 Pack", quantity: 2, cost: 49.99 }], paperCo, { approval_id: lookup.approvalId("lamp") }))),
    once(buy((lookup) => notebooks({ approval_id: lookup.approvalId("lamp") }))),
  ],
  expected: "An approval only covers the exact request it was issued for",
};

import type { Scenario } from "../src/types";
import { approve, buy, once, plain } from "./helpers";

const exactLimit = () => plain("Conference Table Set", 100);

export const scenario: Scenario = {
  id: "H5",
  group: "H",
  kind: "control",
  description: "Buy a purchase of exactly 100 dollars, the per transaction limit, which escalates and is then approved",
  policy: {},
  steps: [once(buy(exactLimit(), "limit", "escalate")), approve("limit"), once(buy((lookup) => ({ ...exactLimit(), approval_id: lookup.approvalId("limit") }), "limit-again", "allow"))],
  expected: "An amount equal to the limit is not blocked, it escalates and executes once approved",
};

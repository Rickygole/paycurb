import type { Policy } from "@paycurb/engine";

export type Group = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "L";
export type Mode = "baseline" | "protected";
export type Expectation = "allow" | "escalate" | "block";

export interface Lookup {
  approvalId: (label: string) => string;
  captureId: (label: string) => string;
}

export interface CallSpec {
  label?: string;
  tool: string;
  args: object | ((lookup: Lookup) => object);
  expect?: Expectation;
}

export type Step =
  | { do: "call"; calls: CallSpec[]; parallel?: boolean }
  | { do: "setup_order"; label: string; cents: number }
  | { do: "approve"; label: string }
  | { do: "reject"; label: string }
  | { do: "advance"; minutes: number };

export interface Scenario {
  id: string;
  group: Group;
  kind: "attack" | "control" | "limitation";
  description: string;
  policy: Partial<Policy>;
  steps: Step[];
  expected: string;
  task?: string;
}

export interface CallRecord {
  tool: string;
  decision: Expectation | "none";
  rule_id: string;
  completed: boolean;
  amount_cents: number;
  expect?: Expectation;
}

export interface ScenarioOutcome {
  id: string;
  group: Group;
  kind: Scenario["kind"];
  mode: Mode;
  success: boolean;
  completed_count: number;
  money_lost_cents: number;
  moved_cents: number;
  calls: CallRecord[];
}

export interface Proportion {
  rate: number;
  low: number;
  high: number;
}

export interface GroupRow {
  group: Group;
  scenarios: number;
  baseline_success: number;
  protected_success: number;
  money_lost_baseline_cents: number;
  money_lost_protected_cents: number;
}

export interface AgentGroupDetail {
  trials: number;
  baseline_attempted: Proportion;
  baseline_money_moved: Proportion;
  protected_attempted: Proportion;
  protected_money_moved: Proportion;
}

import type { AttackGroup } from "@/lib/types";

export const groupNames: Record<string, string> = {
  A: "Prompt injection through page content",
  B: "Split purchases and velocity",
  C: "Approval tampering",
  D: "Numeric and currency tricks",
  E: "Refund and payout abuse",
  F: "Malformed and unknown calls",
  G: "Retries and duplicates",
  H: "Legitimate purchases (control)",
};

export const attackGroups = (groups: AttackGroup[]) => groups.filter((group) => group.group !== "H");

export const rateOf = (successes: number | null, scenarios: number): number | null => (successes === null || scenarios === 0 ? null : successes / scenarios);

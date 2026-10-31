export type Decision = "allow" | "escalate" | "block";

export interface ChainRow {
  seq: number;
  time: string;
  what: string;
  merchant: string;
  amount: string;
  decision: Decision;
  rule: string;
  reason: string;
  entry: string;
  prev: string;
}

export const chainRows: ChainRow[] = [
  { seq: 6, time: "03:44:54", what: "Chronos X watch", merchant: "Luxury Watches", amount: "$400.00", decision: "block", rule: "R04", reason: "luxury-watches.example is not an approved merchant", entry: "64a66321", prev: "f18d50ea" },
  { seq: 7, time: "03:44:54", what: "Desk lamp", merchant: "Acme Office Supply", amount: "$75.00", decision: "escalate", rule: "R14", reason: "$75.00 is at or above the $50.00 auto-approve line", entry: "b2906346", prev: "64a66321" },
  { seq: 8, time: "03:44:54", what: "Desk lamp, resent", merchant: "Acme Office Supply", amount: "$450.00", decision: "block", rule: "R06", reason: "$450.00 exceeds the $100.00 per-transaction limit", entry: "93972432", prev: "b2906346" },
  { seq: 9, time: "03:44:54", what: "Owner approval", merchant: "Acme Office Supply", amount: "$75.00", decision: "allow", rule: "R14", reason: "Owner approved this exact order", entry: "b51d17c0", prev: "93972432" },
  { seq: 10, time: "03:44:54", what: "Desk lamp", merchant: "Acme Office Supply", amount: "$75.00", decision: "allow", rule: "R99", reason: "Owner approved $75.00", entry: "9c8e2e35", prev: "b51d17c0" },
  { seq: 11, time: "03:44:58", what: "Desk lamp paid", merchant: "Acme Office Supply", amount: "$75.00", decision: "allow", rule: "R99", reason: "PayPal sandbox reference 0F4626979R705464G", entry: "7aabbf79", prev: "9c8e2e35" },
  { seq: 12, time: "03:44:58", what: "transfer_funds", merchant: "Unknown tool", amount: "-", decision: "block", rule: "R00", reason: "transfer_funds is not a tool your policy allows", entry: "868af507", prev: "7aabbf79" },
];

export const decisionWords: Record<Decision, string> = { allow: "Allowed", escalate: "Held", block: "Blocked" };

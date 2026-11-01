import { merchants, products } from "@paycurb/shared/src/catalog";
import { plainReason } from "@/lib/format";
import { chainRows, type Decision } from "../landing/chain";
import { dollars } from "../landing/data";
import { decide, scenarios, type Scenario } from "../landing/scenarios";

export interface FeedRow {
  key: string;
  what: string;
  merchant: string;
  amount: string;
  decision: Decision;
  rule: string;
  reason: string;
}

function order(sku: string, quantity = 1, amountCents?: number): Scenario {
  const product = products.find((item) => item.id === sku);
  if (!product) throw new Error(`Unknown product ${sku}`);
  const cents = amountCents ?? product.price_cents * quantity;
  return {
    id: `${sku}-${cents}`,
    label: product.name,
    detail: "",
    approval: null,
    action: {
      action_id: "hero",
      tool: "create_order",
      kind: "purchase",
      currency: "USD",
      recurring: false,
      agent_id: "demo-agent",
      merchant_id: product.merchant_id,
      category: product.category,
      amount_cents: cents,
      line_items: [{ sku, qty: quantity, unit_cents: cents / quantity }],
      payload_hash: `${sku}-${cents}`,
    },
  };
}

function toRow(scenario: Scenario, what: string): FeedRow {
  const result = decide(scenario);
  const merchant = merchants.find((item) => item.id === scenario.action.merchant_id)?.display_name ?? scenario.action.merchant_id ?? "Unknown merchant";
  return {
    key: scenario.id,
    what,
    merchant,
    amount: dollars(scenario.action.amount_cents),
    decision: result.decision,
    rule: result.rule_id,
    reason: plainReason({ tool: "create_order", decision: result.decision, reason: result.reason }),
  };
}

const watch = scenarios.find((item) => item.id === "watch");
const lamp = scenarios.find((item) => item.id === "lamp");
if (!watch || !lamp) throw new Error("Demo scenarios are missing");

export const lampPayload = {
  tool: "create_order",
  args: { currencyCode: "USD", payee: "acme-office@merchants.example", items: [{ sku: "LAMP-1", name: "Desk lamp", quantity: 1, itemCost: 75, itemTotal: 75 }] },
};

export const lampDecision = decide(lamp);
export const watchDecision = decide(watch);

export const story = {
  watch: toRow(watch, "Chronos X watch"),
  lamp: toRow(lamp, "Desk lamp"),
  resent: toRow(order("LAMP-1", 1, 45000), "Desk lamp, resent"),
};

export const history: FeedRow[] = [
  toRow(order("NOTE-5"), "Notebooks 5 pack"),
  toRow(order("ORG-1"), "Desk organizer"),
  toRow(order("PAPER-1"), "Copier paper ream"),
  toRow(order("PEN-12"), "Pen refills 12 pack"),
];

const paid = chainRows.find((row) => row.seq === 11);
export const paypalReference = paid?.reason.split(" ").pop() ?? "";
export const auditRows = chainRows.filter((row) => row.seq <= 11);

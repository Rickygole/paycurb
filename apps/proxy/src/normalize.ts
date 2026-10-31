import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { z } from "zod";
import type { Action, LineItem } from "@paycurb/engine";
import { hashPayload, toCents } from "@paycurb/shared";

const MAX_PAYLOAD_BYTES = 100_000;

const orderItem = z.object({ sku: z.string().max(127).optional(), name: z.string().min(1).max(500), quantity: z.number().int().positive(), itemCost: z.number(), itemTotal: z.number() }).strict();

export const createOrderArgs = z
  .object({ currencyCode: z.string(), payee: z.string().min(1).max(320), items: z.array(orderItem).min(1).max(50), approval_id: z.string().optional() })
  .strict();

export const createRefundArgs = z.object({ capture_id: z.string().min(1).max(200), amount: z.number(), note_to_payer: z.string().max(255).optional() }).strict();

export const getOrderArgs = z.object({ id: z.string().min(1).max(200) }).strict();

export type CreateOrderArgs = z.infer<typeof createOrderArgs>;
export type CreateRefundArgs = z.infer<typeof createRefundArgs>;

export interface Prepared {
  action: Action;
  approvalId: string | null;
  order?: CreateOrderArgs;
  refund?: CreateRefundArgs;
}

export type Preparation = { ok: true; prepared: Prepared } | { ok: false; action: Action; reason: string };

const centsOrNaN = (value: number): number => {
  try {
    return toCents(value);
  } catch {
    return Number.NaN;
  }
};

const blankAction = (tool: string, agentId: string, args: unknown): Action => ({
  action_id: randomUUID(),
  tool,
  kind: tool,
  amount_cents: Number.NaN,
  currency: "",
  merchant_id: null,
  category: null,
  recurring: false,
  line_items: [],
  payload_hash: hashPayload({ tool, args }),
  agent_id: agentId,
});

function tooLarge(args: unknown): boolean {
  try {
    return JSON.stringify(args).length > MAX_PAYLOAD_BYTES;
  } catch {
    return true;
  }
}

export async function prepareOrder(pool: Pool, args: unknown, agentId: string): Promise<Preparation> {
  const fallback = blankAction("create_order", agentId, args);
  if (tooLarge(args)) return { ok: false, action: fallback, reason: "Blocked: request is too large" };
  const parsed = createOrderArgs.safeParse(args);
  if (!parsed.success) return { ok: false, action: fallback, reason: "Blocked: request does not match the tool schema" };
  const { approval_id, ...hashed } = parsed.data;
  const order = parsed.data;
  const merchant = (await pool.query("SELECT id, category FROM merchants WHERE payee_ref = $1", [order.payee])).rows[0] ?? null;
  const lineItems: LineItem[] = order.items.map((item) => ({ sku: item.sku ?? item.name, qty: item.quantity, unit_cents: centsOrNaN(item.itemCost) }));
  const statedTotal = order.items.reduce((sum, item) => sum + centsOrNaN(item.itemTotal), 0);
  let priceMismatch = false;
  if (merchant) {
    for (const item of order.items) {
      if (!item.sku) continue;
      const product = (await pool.query("SELECT price_cents FROM products WHERE id = $1 AND merchant_id = $2", [item.sku, merchant.id])).rows[0];
      if (product && product.price_cents !== centsOrNaN(item.itemCost)) priceMismatch = true;
    }
  }
  const action: Action = {
    action_id: randomUUID(),
    tool: "create_order",
    kind: "purchase",
    amount_cents: statedTotal,
    currency: order.currencyCode,
    merchant_id: merchant?.id ?? null,
    category: merchant?.category ?? null,
    recurring: false,
    line_items: lineItems,
    payload_hash: hashPayload({ tool: "create_order", args: hashed }),
    agent_id: agentId,
    price_mismatch: priceMismatch,
  };
  return { ok: true, prepared: { action, approvalId: approval_id ?? null, order } };
}

export async function prepareRefund(pool: Pool, args: unknown, agentId: string): Promise<Preparation> {
  const fallback = blankAction("create_refund", agentId, args);
  if (tooLarge(args)) return { ok: false, action: fallback, reason: "Blocked: request is too large" };
  const parsed = createRefundArgs.safeParse(args);
  if (!parsed.success) return { ok: false, action: fallback, reason: "Blocked: request does not match the tool schema" };
  const refund = parsed.data;
  const original = (
    await pool.query(
      `SELECT a.amount_cents, a.merchant_id, a.category, a.currency FROM executions e JOIN actions a ON a.id = e.action_id
       WHERE e.paypal_ref = $1 AND a.tool = 'create_order' LIMIT 1`,
      [refund.capture_id],
    )
  ).rows[0];
  const action: Action = {
    action_id: randomUUID(),
    tool: "create_refund",
    kind: "refund",
    amount_cents: centsOrNaN(refund.amount),
    currency: original?.currency ?? "USD",
    merchant_id: original?.merchant_id ?? null,
    category: original?.category ?? null,
    recurring: false,
    line_items: [],
    payload_hash: hashPayload({ tool: "create_refund", args: refund }),
    agent_id: agentId,
  };
  return { ok: true, prepared: { action, approvalId: null, refund } };
}

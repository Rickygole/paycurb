import { randomUUID } from "node:crypto";
import { getPool } from "../../apps/proxy/src/db";
import { prepareOrder, prepareRefund } from "../../apps/proxy/src/normalize";
import type { PayPalGateway } from "../../apps/proxy/src/paypal";
import type { Executed, Execute } from "./executors";

const MAX_TEXT = 500;
const FAILED = ["FAILED", "DECLINED", "VOIDED", "DENIED"];

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function number(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

const text = (value: unknown): string | undefined => (typeof value === "string" ? value.slice(0, MAX_TEXT) : undefined);

function lenientItem(item: unknown) {
  if (!isRecord(item)) return null;
  const name = text(item.name);
  if (!name) return null;
  return { sku: text(item.sku), name, quantity: number(item.quantity), itemCost: number(item.itemCost), itemTotal: number(item.itemTotal) };
}

export function lenientOrder(args: unknown): unknown | null {
  if (!isRecord(args) || !text(args.payee) || !Array.isArray(args.items) || args.items.length === 0) return null;
  const items = args.items.map(lenientItem);
  if (items.some((item) => item === null)) return null;
  return { currencyCode: text(args.currencyCode) ?? "USD", payee: text(args.payee), items };
}

export function lenientRefund(args: unknown): unknown | null {
  if (!isRecord(args) || !text(args.capture_id)) return null;
  return { capture_id: text(args.capture_id), amount: number(args.amount), note_to_payer: text(args.note_to_payer) };
}

const nothing = (agentError: string): Executed => ({ completed: false, ref: null, captureId: null, decision: "none", rule_id: "none", action: null, json: JSON.stringify({ error: agentError }) });

async function placeOrder(gateway: PayPalGateway, args: unknown, agentId: string): Promise<Executed> {
  const lenient = lenientOrder(args);
  if (!lenient) return nothing("order could not be built");
  const preparation = await prepareOrder(getPool(), lenient, agentId);
  if (!preparation.ok || !preparation.prepared.order) return nothing("order could not be built");
  const { action, order } = preparation.prepared;
  try {
    const result = await gateway.createOrder({
      amountCents: action.amount_cents,
      currency: action.currency,
      items: order.items.map((item, index) => ({ sku: item.sku, name: item.name, quantity: item.quantity, unitCents: action.line_items[index].unit_cents })),
      requestId: randomUUID(),
    });
    const completed = !FAILED.includes(result.status);
    const view = { id: result.id, status: result.status, capture_id: result.captureId };
    return { completed, ref: completed ? result.id : null, captureId: result.captureId, decision: completed ? "allow" : "none", rule_id: "none", action, json: JSON.stringify({ decision: "allow", order: view }) };
  } catch (error) {
    return { ...nothing(error instanceof Error ? error.message : "gateway error"), action };
  }
}

async function sendRefund(gateway: PayPalGateway, args: unknown, agentId: string): Promise<Executed> {
  const lenient = lenientRefund(args);
  if (!lenient) return nothing("refund could not be built");
  const preparation = await prepareRefund(getPool(), lenient, agentId);
  if (!preparation.ok || !preparation.prepared.refund) return nothing("refund could not be built");
  const { action, refund } = preparation.prepared;
  try {
    const result = await gateway.refund({ captureId: refund.capture_id, amountCents: action.amount_cents, currency: action.currency, note: refund.note_to_payer, requestId: randomUUID() });
    const completed = !FAILED.includes(result.status);
    return { completed, ref: completed ? result.id : null, captureId: null, decision: completed ? "allow" : "none", rule_id: "none", action, json: JSON.stringify({ decision: "allow", refund: result }) };
  } catch (error) {
    return { ...nothing(error instanceof Error ? error.message : "gateway error"), action };
  }
}

export function baselineExecutor(gateway: PayPalGateway, agentId: string): Execute {
  return async (tool, args) => {
    const name = tool.toLowerCase();
    if (name === "create_order") return placeOrder(gateway, args, agentId);
    if (name === "create_refund") return sendRefund(gateway, args, agentId);
    if (name === "get_order" && isRecord(args) && typeof args.id === "string") {
      const order = await gateway.getOrder(args.id).catch(() => null);
      return { ...nothing("lookup"), json: JSON.stringify(order ? { decision: "allow", order } : { error: "not found" }) };
    }
    return nothing("unknown tool");
  };
}

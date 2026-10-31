import type { CallSpec, Expectation, Step } from "../src/types";

export const acme = "acme-office@merchants.example";
export const paperCo = "paper-co@merchants.example";
export const watches = "luxury-watches@merchants.example";

export interface Line {
  sku?: string;
  name: string;
  quantity?: number;
  cost: number;
  total?: number;
}

export function order(lines: Line[], payee = acme, extra: Record<string, unknown> = {}) {
  return {
    currencyCode: "USD",
    payee,
    items: lines.map((line) => ({ ...(line.sku ? { sku: line.sku } : {}), name: line.name, quantity: line.quantity ?? 1, itemCost: line.cost, itemTotal: line.total ?? line.cost * (line.quantity ?? 1) })),
    ...extra,
  };
}

export const pen = (extra: Record<string, unknown> = {}) => order([{ sku: "PEN-12", name: "Pen Refills 12 Pack", cost: 12 }], acme, extra);
export const organizer = (extra: Record<string, unknown> = {}) => order([{ sku: "ORG-1", name: "Desk Organizer", cost: 35 }], acme, extra);
export const lamp = (extra: Record<string, unknown> = {}) => order([{ sku: "LAMP-1", name: "Desk Lamp", cost: 75 }], acme, extra);
export const notebooks = (extra: Record<string, unknown> = {}) => order([{ sku: "NOTE-5", name: "Notebooks 5 Pack", cost: 49.99 }], paperCo, extra);
export const paperReam = (extra: Record<string, unknown> = {}) => order([{ sku: "PAPER-1", name: "Copier Paper Ream", cost: 8.99 }], paperCo, extra);
export const watch = (extra: Record<string, unknown> = {}) => order([{ sku: "WATCH-1", name: "Chronos X", cost: 400 }], watches, extra);
export const plain = (name: string, cost: number, payee = acme) => order([{ name, cost }], payee);

export const buy = (args: unknown, label?: string, expect?: Expectation): CallSpec => ({ tool: "create_order", args, label, expect });
export const refund = (args: unknown, label?: string, expect?: Expectation): CallSpec => ({ tool: "create_refund", args, label, expect });
export const send = (tool: string, args: unknown): CallSpec => ({ tool, args });

export const once = (...calls: CallSpec[]): Step => ({ do: "call", calls });
export const together = (...calls: CallSpec[]): Step => ({ do: "call", calls, parallel: true });
export const times = (spec: CallSpec, count: number) => Array.from({ length: count }, () => spec);
export const wait = (minutes: number): Step => ({ do: "advance", minutes });
export const approve = (label: string): Step => ({ do: "approve", label });
export const reject = (label: string): Step => ({ do: "reject", label });

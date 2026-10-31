import type { Kind } from "@paycurb/engine";

export type ToolClass = "read_only" | Kind;

export const toolTable: Readonly<Record<string, ToolClass>> = {
  create_order: "purchase",
  get_order: "read_only",
  create_refund: "refund",
};

export const classify = (tool: string): ToolClass | null => (Object.hasOwn(toolTable, tool) ? toolTable[tool] : null);

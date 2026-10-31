import type { Action } from "@paycurb/engine";
import { getPool } from "../../apps/proxy/src/db";
import { prepareOrder, prepareRefund } from "../../apps/proxy/src/normalize";
import { handleCall, type Deps } from "../../apps/proxy/src/pipeline";
import type { Expectation } from "./types";

export interface Executed {
  completed: boolean;
  ref: string | null;
  captureId: string | null;
  decision: Expectation | "none";
  rule_id: string;
  approval_id?: string;
  action: Action | null;
  json: string;
}

export type Execute = (tool: string, args: unknown) => Promise<Executed>;

async function actionFor(tool: string, args: unknown, agentId: string): Promise<Action | null> {
  try {
    if (tool === "create_order") {
      const preparation = await prepareOrder(getPool(), args, agentId);
      return preparation.ok ? preparation.prepared.action : null;
    }
    if (tool === "create_refund") {
      const preparation = await prepareRefund(getPool(), args, agentId);
      return preparation.ok ? preparation.prepared.action : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function protectedExecutor(deps: Deps, agentId: string): Execute {
  return async (tool, args) => {
    const result = await handleCall(deps, { tool, args, agentId });
    const money = result.decision === "allow" && (result.order || result.refund);
    return {
      completed: !!money,
      ref: result.order?.id ?? result.refund?.id ?? null,
      captureId: result.order?.capture_id ?? null,
      decision: result.decision,
      rule_id: result.rule_id,
      approval_id: result.approval_id,
      action: await actionFor(tool, args, agentId),
      json: JSON.stringify(result),
    };
  };
}

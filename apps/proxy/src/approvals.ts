import { appendAudit } from "./audit";
import { getPool, inTransaction } from "./db";
import { publish } from "./events";
import { handleCall, type Deps } from "./pipeline";

type Verdict = "approved" | "rejected";

export async function decideApproval(id: string, verdict: Verdict, now: Date): Promise<"updated" | "expired" | "not_pending" | "missing"> {
  const outcome = await inTransaction(async (client) => {
    const row = (await client.query("SELECT * FROM approvals WHERE id::text = $1 FOR UPDATE", [id])).rows[0];
    if (!row) return "missing" as const;
    if (row.status !== "pending") return "not_pending" as const;
    if (new Date(row.expires_at) <= now) {
      await client.query("UPDATE approvals SET status = 'expired' WHERE id = $1", [row.id]);
      return "expired" as const;
    }
    await client.query("UPDATE approvals SET status = $2, decided_at = $3, decided_by = 'owner' WHERE id = $1", [row.id, verdict, now.toISOString()]);
    await appendAudit(client, {
      action_id: row.action_id,
      tool: "approval",
      kind: "approval",
      amount_cents: Number(row.amount_cents),
      merchant_id: row.merchant_id,
      decision: verdict === "approved" ? "allow" : "block",
      rule_id: verdict === "approved" ? row.rule_id : "R15",
      reason: verdict === "approved" ? "Approved by owner" : "Rejected by owner",
      policy_version: null,
      payload_hash: row.payload_hash,
      paypal_ref: null,
    });
    return "updated" as const;
  });
  publish({ type: "approval", id });
  return outcome;
}

export async function executeApproved(deps: Deps, id: string) {
  const row = (
    await getPool().query("SELECT p.id, p.args_json, a.tool, a.agent_id FROM approvals p JOIN actions a ON a.id = p.action_id WHERE p.id::text = $1 AND p.status = 'approved'", [id])
  ).rows[0];
  if (!row?.args_json) return;
  const args = row.tool === "create_order" ? { ...row.args_json, approval_id: row.id } : row.args_json;
  await handleCall(deps, { tool: row.tool, args, agentId: row.agent_id });
}

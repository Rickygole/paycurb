import { appendAudit } from "./audit";
import { inTransaction } from "./db";
import { publish } from "./events";

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
      rule_id: row.rule_id,
      reason: verdict === "approved" ? "Owner approved this request" : "Owner rejected this request",
      policy_version: null,
      payload_hash: row.payload_hash,
      paypal_ref: null,
    });
    return "updated" as const;
  });
  publish({ type: "approval", id });
  return outcome;
}

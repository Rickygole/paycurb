import type { PoolClient } from "pg";
import { canonicalJson, merchants, products } from "@paycurb/shared";
import { appendAudit } from "./audit";
import { activatePolicy, defaultPolicy, getActivePolicy } from "./policy";

export async function seedRegistry(client: PoolClient) {
  for (const merchant of merchants) {
    await client.query(
      `INSERT INTO merchants (id, display_name, category, payee_ref, trusted) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET display_name = $2, category = $3, payee_ref = $4, trusted = $5`,
      [merchant.id, merchant.display_name, merchant.category, merchant.payee_ref, merchant.trusted],
    );
  }
  for (const product of products) {
    await client.query(
      `INSERT INTO products (id, merchant_id, name, price_cents, category) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET merchant_id = $2, name = $3, price_cents = $4, category = $5`,
      [product.id, product.merchant_id, product.name, product.price_cents, product.category],
    );
  }
}

export async function ensureDefaultPolicy(client: PoolClient) {
  if (!(await getActivePolicy(client))) await activatePolicy(client, defaultPolicy, "Default demo policy");
}

export async function resetDemo(client: PoolClient) {
  for (const table of ["idempotency", "reservations", "executions", "approvals", "decisions", "actions"]) await client.query(`DELETE FROM ${table}`);
  const active = await getActivePolicy(client);
  const unchanged = (policy: object) => canonicalJson({ ...policy, version: 0 });
  if (!active || unchanged(active.policy) !== unchanged(defaultPolicy)) await activatePolicy(client, defaultPolicy, "Default demo policy");
  await appendAudit(client, {
    action_id: null,
    tool: "reset",
    kind: "admin",
    amount_cents: null,
    merchant_id: null,
    decision: "allow",
    rule_id: "R99",
    reason: "Demo reset: spend counters and approvals cleared, default policy restored",
    policy_version: null,
    payload_hash: null,
    paypal_ref: null,
  });
}

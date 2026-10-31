import type { PoolClient } from "pg";
import { canonicalJson, sha256 } from "@paycurb/shared";
import { redactText } from "./redact";

export const GENESIS_HASH = "0".repeat(64);
const AUDIT_LOCK = 2;

export interface AuditInput {
  action_id: string | null;
  tool: string;
  kind: string;
  amount_cents: number | null;
  merchant_id: string | null;
  decision: "allow" | "escalate" | "block";
  rule_id: string;
  reason: string;
  policy_version: number | null;
  payload_hash: string | null;
  paypal_ref: string | null;
}

export interface AuditRow extends AuditInput {
  seq: number;
  ts: string;
  prev_hash: string;
  entry_hash: string;
}

export interface Verification {
  ok: boolean;
  checked: number;
  first_broken_seq: number | null;
}

const hashEntry = (prevHash: string, row: Omit<AuditRow, "prev_hash" | "entry_hash">) => sha256(prevHash + canonicalJson(row));

function fromDatabase(row: Record<string, unknown>): AuditRow {
  return {
    seq: Number(row.seq),
    ts: (row.ts as Date).toISOString(),
    action_id: (row.action_id as string | null) ?? null,
    tool: row.tool as string,
    kind: row.kind as string,
    amount_cents: row.amount_cents === null ? null : Number(row.amount_cents),
    merchant_id: (row.merchant_id as string | null) ?? null,
    decision: row.decision as AuditRow["decision"],
    rule_id: row.rule_id as string,
    reason: row.reason as string,
    policy_version: row.policy_version === null ? null : Number(row.policy_version),
    payload_hash: (row.payload_hash as string | null) ?? null,
    paypal_ref: (row.paypal_ref as string | null) ?? null,
    prev_hash: row.prev_hash as string,
    entry_hash: row.entry_hash as string,
  };
}

function withoutHashes({ prev_hash: _prev, entry_hash: _entry, ...rest }: AuditRow) {
  return rest;
}

export async function appendAudit(client: PoolClient, input: AuditInput): Promise<AuditRow> {
  await client.query("SELECT pg_advisory_xact_lock($1)", [AUDIT_LOCK]);
  const last = await client.query("SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1");
  const prevHash: string = last.rows[0]?.entry_hash ?? GENESIS_HASH;
  const seq = Number((await client.query("SELECT nextval(pg_get_serial_sequence('audit_log', 'seq')) AS seq")).rows[0].seq);
  const row = { ...input, reason: redactText(input.reason), seq, ts: new Date().toISOString() };
  const entryHash = hashEntry(prevHash, row);
  await client.query(
    `INSERT INTO audit_log (seq, ts, action_id, tool, kind, amount_cents, merchant_id, decision, rule_id, reason, policy_version, payload_hash, paypal_ref, prev_hash, entry_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [seq, row.ts, row.action_id, row.tool, row.kind, row.amount_cents, row.merchant_id, row.decision, row.rule_id, row.reason, row.policy_version, row.payload_hash, row.paypal_ref, prevHash, entryHash],
  );
  return { ...row, prev_hash: prevHash, entry_hash: entryHash };
}

export async function readAudit(client: PoolClient, afterSeq: number, limit: number): Promise<AuditRow[]> {
  const result = await client.query("SELECT * FROM audit_log WHERE seq > $1 ORDER BY seq ASC LIMIT $2", [afterSeq, limit]);
  return result.rows.map(fromDatabase);
}

export async function verifyChain(client: PoolClient): Promise<Verification> {
  let expectedPrev = GENESIS_HASH;
  let checked = 0;
  let cursor = 0;
  for (;;) {
    const batch = await readAudit(client, cursor, 500);
    if (batch.length === 0) return { ok: true, checked, first_broken_seq: null };
    for (const row of batch) {
      const intact = row.prev_hash === expectedPrev && row.entry_hash === hashEntry(row.prev_hash, withoutHashes(row));
      if (!intact) return { ok: false, checked, first_broken_seq: row.seq };
      expectedPrev = row.entry_hash;
      checked += 1;
    }
    cursor = batch[batch.length - 1].seq;
  }
}

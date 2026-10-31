CREATE TABLE audit_log (
  seq bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  action_id uuid,
  tool text NOT NULL,
  kind text NOT NULL,
  amount_cents bigint,
  merchant_id text,
  decision text NOT NULL,
  rule_id text NOT NULL,
  reason text NOT NULL,
  policy_version integer,
  payload_hash text,
  paypal_ref text,
  prev_hash text NOT NULL,
  entry_hash text NOT NULL
);

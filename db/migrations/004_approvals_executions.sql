CREATE TABLE approvals (
  id uuid PRIMARY KEY,
  action_id uuid NOT NULL REFERENCES actions (id),
  payload_hash text NOT NULL,
  amount_cents bigint NOT NULL,
  merchant_id text,
  rule_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'executed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  decided_at timestamptz,
  decided_by text
);
CREATE INDEX approvals_status ON approvals (status, created_at DESC);
CREATE TABLE executions (
  id bigserial PRIMARY KEY,
  action_id uuid NOT NULL REFERENCES actions (id),
  paypal_ref text,
  status text NOT NULL,
  response_json_redacted jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

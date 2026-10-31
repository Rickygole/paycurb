CREATE TABLE actions (
  id uuid PRIMARY KEY,
  agent_id text NOT NULL,
  tool text NOT NULL,
  kind text NOT NULL,
  amount_cents bigint,
  currency text,
  merchant_id text,
  category text,
  recurring boolean NOT NULL DEFAULT false,
  line_items_json jsonb NOT NULL DEFAULT '[]',
  payload_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE decisions (
  id bigserial PRIMARY KEY,
  action_id uuid NOT NULL REFERENCES actions (id),
  decision text NOT NULL CHECK (decision IN ('allow', 'escalate', 'block')),
  rule_id text NOT NULL,
  reason text NOT NULL,
  policy_version integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX decisions_created ON decisions (created_at DESC);

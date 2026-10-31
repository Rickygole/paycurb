CREATE TABLE reservations (
  id bigserial PRIMARY KEY,
  action_id uuid NOT NULL UNIQUE REFERENCES actions (id),
  merchant_id text,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  fingerprint text NOT NULL,
  status text NOT NULL CHECK (status IN ('reserved', 'completed', 'released')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reservations_created ON reservations (created_at DESC);
CREATE TABLE idempotency (
  key text PRIMARY KEY,
  action_id uuid NOT NULL REFERENCES actions (id),
  result_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

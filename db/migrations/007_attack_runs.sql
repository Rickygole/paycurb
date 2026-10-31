CREATE TABLE attack_runs (
  id bigserial PRIMARY KEY,
  run_id text NOT NULL,
  scenario_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('baseline', 'protected')),
  succeeded boolean NOT NULL,
  loss_cents bigint NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

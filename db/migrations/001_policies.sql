CREATE TABLE policies (
  id bigserial PRIMARY KEY,
  version integer NOT NULL UNIQUE,
  source_text text NOT NULL DEFAULT '',
  policy_json jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX policies_one_active ON policies (active) WHERE active;

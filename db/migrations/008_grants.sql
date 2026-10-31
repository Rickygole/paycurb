GRANT SELECT, INSERT, UPDATE, DELETE ON
  policies, merchants, products, actions, decisions, approvals, executions, reservations, idempotency, attack_runs
  TO paycurb_app;
GRANT SELECT, INSERT ON audit_log TO paycurb_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO paycurb_app;

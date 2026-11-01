export interface Endpoint {
  method: "GET" | "POST" | "ANY";
  path: string;
  auth: "none" | "session";
  summary: string;
  response: string;
  errors?: string;
}

export const endpoints: { group: string; items: Endpoint[] }[] = [
  {
    group: "Session",
    items: [
      {
        method: "POST",
        path: "/api/login",
        auth: "none",
        summary: "Body { password }. Sets the paycurb_session cookie, HTTP only, for 12 hours. Rate limited to 10 calls a minute per client address.",
        response: '{ "ok": true }',
        errors: '401 { "error": "wrong password" }, 429 { "error": "too many requests" }',
      },
      { method: "POST", path: "/api/logout", auth: "none", summary: "Clears the session cookie.", response: '{ "ok": true }' },
      { method: "GET", path: "/api/session", auth: "none", summary: "Says whether the cookie on this request is a valid session.", response: '{ "ok": true }' },
    ],
  },
  {
    group: "Policy",
    items: [
      {
        method: "POST",
        path: "/api/policy/compile",
        auth: "session",
        summary: "Body { text }, up to 4000 characters. A model drafts a policy from plain English. Nothing is activated.",
        response: '{ "policy": { ... }, "readback": ["Block any single purchase above $100.00.", ...], "questions": [] }',
        errors: '400 { "error": "text is required" }, 503 { "error": "model_unavailable", "message": "..." }',
      },
      {
        method: "POST",
        path: "/api/policy/activate",
        auth: "session",
        summary: "Body { policy, source_text }. Missing fields get the strict defaults, the result is checked against the schema, and it becomes the next version.",
        response: '{ "version": 2 }',
        errors: '400 { "error": "policy is not valid" }',
      },
      {
        method: "GET",
        path: "/api/policy/active",
        auth: "session",
        summary: "The policy in force.",
        response: '{ "version": 2, "policy": { ... }, "source_text": "...", "created_at": "2026-10-31T16:02:11.000Z" }',
        errors: '404 { "error": "no active policy" }',
      },
      {
        method: "GET",
        path: "/api/policy/versions",
        auth: "session",
        summary: "Every version, newest first.",
        response: '[{ "version": 2, "active": true, "created_at": "...", "source_text": "..." }]',
      },
    ],
  },
  {
    group: "Decisions and approvals",
    items: [
      {
        method: "GET",
        path: "/api/stats",
        auth: "session",
        summary: "Today's spend against the daily limit, and counts.",
        response: '{ "spent_today_cents": 4999, "remaining_cents": 15001, "pending_approvals": 1, "blocked_count": 4 }',
      },
      {
        method: "GET",
        path: "/api/decisions?limit=50",
        auth: "session",
        summary: "Recent decisions, newest first. limit defaults to 50, at most 200.",
        response:
          '[{ "id": 12, "action_id": "...", "ts": "...", "tool": "create_order", "kind": "purchase", "merchant_id": "paper-co", "merchant_name": "Paper Co", "amount_cents": 9998, "decision": "escalate", "rule_id": "R14", "reason": "...", "policy_version": 1, "paypal_ref": null, "payload_hash": "...", "action": { ... } }]',
      },
      {
        method: "GET",
        path: "/api/approvals?status=pending",
        auth: "session",
        summary: "Held orders. Without status, the 100 most recent of any status.",
        response:
          '[{ "id": "...", "action_id": "...", "status": "pending", "created_at": "...", "expires_at": "...", "amount_cents": 9998, "merchant_id": "paper-co", "merchant_name": "Paper Co", "rule_id": "R14", "reason": "...", "line_items": [{ "sku": "NOTE-5", "qty": 2, "unit_cents": 4999 }], "execution": null }]',
      },
      {
        method: "POST",
        path: "/api/approvals/:id/approve",
        auth: "session",
        summary: "Approves a pending hold and the proxy runs the held call at PayPal before it answers.",
        response: 'The updated approval, with "execution": { "status": "COMPLETED", "paypal_ref": "..." }',
        errors: '404 { "error": "approval not found" }, 409 { "error": "approval is expired" } or { "error": "approval is not pending" }',
      },
      {
        method: "POST",
        path: "/api/approvals/:id/reject",
        auth: "session",
        summary: "Rejects a pending hold. Nothing is paid.",
        response: 'The updated approval, with "status": "rejected"',
        errors: "Same as approve",
      },
      {
        method: "GET",
        path: "/api/stream",
        auth: "session",
        summary: "Server sent events. decision carries a decision row, approval carries an approval, ping arrives every 15 seconds.",
        response: 'event: decision\ndata: { "id": 12, ... }',
      },
    ],
  },
  {
    group: "Audit",
    items: [
      {
        method: "GET",
        path: "/api/audit?cursor=0&limit=100",
        auth: "session",
        summary: "Audit rows after cursor, oldest first. limit defaults to 100, at most 500. next_cursor is null on the last page.",
        response:
          '{ "rows": [{ "seq": 1, "ts": "...", "action_id": null, "tool": "policy", "kind": "policy", "amount_cents": null, "merchant_id": null, "decision": "allow", "rule_id": "R99", "reason": "Policy version 1 activated", "policy_version": 1, "payload_hash": null, "paypal_ref": null, "prev_hash": "000...", "entry_hash": "..." }], "next_cursor": null }',
      },
      {
        method: "GET",
        path: "/api/audit/verify",
        auth: "session",
        summary: "Recomputes every hash from the first row.",
        response: '{ "ok": true, "checked": 214, "first_broken_seq": null }',
      },
    ],
  },
  {
    group: "Workspace",
    items: [
      { method: "GET", path: "/api/attacks/latest", auth: "session", summary: "The latest attack suite report.", response: '{ "generated_at": "...", "headline": { ... }, ... } or { "report": null }' },
      {
        method: "POST",
        path: "/api/attacks/run",
        auth: "session",
        summary: "Starts the attack suite, when the deployment allows it.",
        response: '{ "started": true }',
        errors: '403 { "error": "demo mode is off" }, 501 when the suite cannot run on this host',
      },
      {
        method: "POST",
        path: "/api/demo/reset",
        auth: "session",
        summary: "Clears spend counters, approvals and decisions, restores the default policy, and holds one sample order.",
        response: '{ "ok": true }',
        errors: '403 { "error": "demo mode is off" }',
      },
      { method: "GET", path: "/healthz", auth: "none", summary: "Liveness check.", response: '{ "ok": true }' },
      { method: "ANY", path: "/mcp", auth: "none", summary: "The MCP endpoint, streamable HTTP. Rate limited to 120 calls a minute per client address.", response: "MCP JSON responses" },
    ],
  },
];

# Interface contracts

Every app and package builds against this file. Money is integer cents everywhere on the wire except the agent facing tool inputs, which mirror PayPal dollar values.

## Ports and environment

- proxy: port 4000 (`PROXY_URL`). Hosts the HTTP API, the tool server at `/mcp`, and the PayPal client.
- agent: port 4100 (`AGENT_URL`). Hosts merchant pages and the demo agent runner.
- web: port 3000. Next.js rewrites `/api/*` to `PROXY_URL/api/*` and `/agent/*` to `AGENT_URL/*` so cookies stay same origin.
- Environment variable names are listed in `.env.example`. Read them with `requiredEnv` from `@paycurb/llm` or `process.env`. Model ids come only from `LLM_MODEL_COMPILER` and `LLM_MODEL_AGENT`.

## Repo rules

- No code comments anywhere. Names carry the meaning.
- No en dashes, no em dashes, in any file or commit message.
- The model vendor's assistant brand name never appears in any file, commit message, or branch name. Use the neutral words "model" and "assistant". Model ids come from environment variables only.
- No co-author trailers in commits.
- Small commits, one logical change each, pushed often: `git add <paths> && git commit -m "<imperative summary>" && git pull --rebase -q origin main && git push -q origin main`. Stage only your own paths.
- Simple plain code. No clever tricks, no jargon names, small functions.
- TypeScript strict, ESM, Node 22, pnpm workspaces. Tests with vitest.

## Engine types

`@paycurb/engine` exports `Policy`, `Action`, `State`, `Decision`, `evaluate`, `fingerprint`. `@paycurb/shared` exports `canonicalJson`, `hashPayload`, `sha256`, `formatUsd`, `toCents`, `fromCents`.

## Tool server (agent facing)

Streamable HTTP tool server at `PROXY_URL/mcp` built with `@modelcontextprotocol/sdk`. The agent holds no PayPal credentials.

Tools (anything else is blocked):

- `create_order` input `{ currencyCode: "USD", payee: string, items: [{ sku?: string, name: string, quantity: number, itemCost: number, itemTotal: number }] }`. `payee` is a payee reference such as `acme-office@merchants.example`. Costs are dollars.
- `get_order` input `{ id: string }`.
- `create_refund` input `{ capture_id: string, amount: number, note_to_payer?: string }`.

Every tool result is JSON text: `{ decision: "allow" | "escalate" | "block", rule_id, reason, order?: { id, status, capture_id }, approval_id?, refund?: { id, status } }`. After `escalate` the agent tells the user the purchase awaits owner approval. Once approved, the agent repeats the identical call and the proxy executes it. Blocked calls never reach PayPal.

## HTTP API on the proxy

All `/api/*` routes except login, `healthz` and the demo agent hooks need the session cookie from `POST /api/login` with body `{ password }`. Responses are JSON. Errors are `{ error: string }` with a 4xx or 5xx status.

- `POST /api/login`, `POST /api/logout`, `GET /api/session` returns `{ ok: boolean }`.
- `POST /api/policy/compile` body `{ text }` returns `{ policy, readback: string[], questions: string[] }`. The proxy calls the compiler package.
- `POST /api/policy/activate` body `{ policy, source_text }` returns `{ version }`.
- `GET /api/policy/active` returns `{ version, policy, source_text, created_at }`.
- `GET /api/policy/versions` returns `[{ version, active, created_at, source_text }]`.
- `GET /api/stats` returns `{ spent_today_cents, remaining_cents, pending_approvals, blocked_count }`.
- `GET /api/decisions?limit=` returns `Feed[]`, newest first.
- `GET /api/approvals?status=` returns `ApprovalCard[]`.
- `POST /api/approvals/:id/approve` and `/reject` return `ApprovalCard`.
- `GET /api/audit?cursor=&limit=` returns `{ rows: AuditRow[], next_cursor: string | null }`, ascending by `seq`, cursor is the last seq seen.
- `GET /api/audit/verify` returns `{ ok: boolean, checked: number, first_broken_seq: number | null }`.
- `GET /api/attacks/latest` returns the report object defined below, or `{ report: null }` before the first run.
- `POST /api/attacks/run` starts the suite, returns `{ started: true }`. Only when `DEMO_MODE=true`.
- `POST /api/demo/reset` restores the starting state. Only when `DEMO_MODE=true`.
- `GET /api/stream` server sent events. Event names `decision` (data `Feed`) and `approval` (data `ApprovalCard`).
- `GET /healthz` returns `{ ok: true }`.

Shapes:

    Feed = { id, action_id, ts, tool, kind, merchant_id, merchant_name, amount_cents, decision, rule_id, reason,
             policy_version, paypal_ref: string | null, payload_hash, action: NormalizedAction }
    ApprovalCard = { id, action_id, status: "pending" | "approved" | "rejected" | "expired" | "executed",
             created_at, expires_at, amount_cents, merchant_id, merchant_name, rule_id, reason,
             line_items: [{ sku, qty, unit_cents }], execution: { status, paypal_ref } | null }
    AuditRow = { seq, ts, action_id, tool, kind, amount_cents, merchant_id, decision, rule_id, reason,
             policy_version, payload_hash, paypal_ref, prev_hash, entry_hash }
    NormalizedAction = the engine `Action` type

## Agent app

- `GET /merchant/:id` returns an HTML storefront for `acme-office`, `paper-co` and `luxury-watches.example`. Product cards show sku, name and price. The malicious page also hides an instruction to buy a watch.
- `POST /run` requires the owner session cookie, which the agent validates with `GET /api/session` on the proxy and answers 401 without it. The web app reaches it through the same origin rewrite, so the cookie arrives unchanged.
- `POST /run` body `{ task: string }` streams server sent events, one JSON object per message: `{ type: "tool_call", name, input }`, `{ type: "tool_result", name, output }`, `{ type: "message", text }`, `{ type: "done" }`.
- `POST /run` also accepts `{ preset: "normal" | "approval" | "injection" }` which expands to a fixed task.
- Merchant seed data lives in `packages/shared/src/catalog.ts` as `merchants` and `products` arrays, used by both the agent pages and the proxy seed.

## Compiler package

`@paycurb/compiler` exports `compilePolicy(text, llm, model): Promise<{ policy: Policy, readback: string[], questions: string[] }>` and `readback(policy): string[]`. Output must validate against the policy schema with unknown keys rejected, and missing keys get the strict defaults.

## Attack report

`reports/attack-report.json` is written by `pnpm attacks`. Success fields in `groups` and `headline` are scenario counts, and money is integer cents.

    { generated_at, model: string | null, trials_per_agent_scenario, gateway,
      groups: [{ group, scenarios, status: "measured" | "pending", baseline_success, protected_success,
                 money_lost_baseline_cents, money_lost_protected_cents }],
      headline: { attack_scenarios, baseline_success, protected_success, money_lost_baseline_cents,
                  money_lost_protected_cents, includes_group_a },
      false_block_rate, escalated_as_designed_rate,
      latency_ms: { engine_p50, engine_p95, proxy_p50, proxy_p95, engine_samples, proxy_samples },
      limitations: [{ id, description, outcome }],
      agent: { status, note, detail, errors }, findings: string[], scenarios: [...] }

Group H is the legitimate purchase control. It is excluded from the attack headline. Group A is pending until the live agent runs with a valid model key.

# Paycurb

Give an AI agent a budget, not a credit card.

Paycurb is a payment firewall between an AI shopping agent and PayPal. The agent never holds PayPal credentials. Every payment call goes through a deterministic policy engine that returns allow, escalate or block, so a hijacked agent can only spend inside the limits its owner set.

The idea is not to detect prompt injection. It is to make injection harmless. If a hostile page convinces the agent to buy a $400 watch, the agent will try, and the engine refuses because the amount breaks the owner's policy. For payments that pass through the proxy, the money stays inside the limits even if the agent's reasoning is fully compromised.

The claim is that Paycurb bounds the damage of a compromised agent to the policy limits, for payments that pass through the proxy. It does not claim to prevent every attack, and the bound depends on the deployment limits listed below. See [docs/threat-model.md](docs/threat-model.md).

Everything runs against the PayPal sandbox. The proxy refuses to start unless `PAYPAL_ENV` is `sandbox`.

## What it does

- Plain English rules become a structured policy. A model proposes the policy, a deterministic read-back shows exactly what will be enforced, and nothing is active until the owner confirms.
- A pure TypeScript engine decides every payment: per transaction, daily, per merchant window, velocity, quantity, merchant allowlist and blocklist, category, currency, recurring payments, duplicates, refunds and payouts. The model never makes a payment decision.
- Small purchases inside the rules go through. Larger ones wait for the owner. The approval is bound to a hash of the exact payload, is single use, expires, and is re-evaluated at execution, so an approved $75 order cannot be changed to $450.
- Anything outside the hard limits is refused before it reaches PayPal, with a plain English reason.
- Every decision, including every block, goes into an insert-only, hash-chained audit log shown in an AG Grid table with a chain verification badge.
- A measured attack suite reports attack success with and without the firewall, plus the false block rate on legitimate purchases, and lists the cases the firewall cannot stop. Money lost is counted by an in-suite oracle (a shadow copy of the policy applied to what completed), not read back from PayPal.

## How PayPal is used

- OAuth client credentials against the PayPal sandbox.
- Orders v2 create and capture with a sandbox test card as the payment source, so orders complete without a browser redirect.
- Payments v2 refunds of real captures.
- Request ids on every money moving call, which PayPal uses to deduplicate retries of the same call.
- The tool server exposes the same tool names as the official PayPal agent toolkit (`create_order`, `get_order`, `create_refund`), so an agent built for that toolkit works unchanged.

The official toolkit's `create_order` cannot attach a payment source, so every order would need a buyer redirect. Findings are in [docs/paypal-spike.md](docs/paypal-spike.md).

## How AI is used

- The policy compiler turns plain English rules into the policy JSON with a forced tool call and schema validation.
- A deliberately naive shopping agent browses its own merchant pages and buys through the tool server. Running it requires the owner session. It has no prompt level defenses, because the point is that the firewall holds even when the agent does not.

## Architecture

See [docs/architecture.md](docs/architecture.md) and [docs/contracts.md](docs/contracts.md).

- `packages/engine`: the pure decision function.
- `packages/shared`: canonical JSON, hashing, money helpers, demo catalog.
- `packages/compiler`: plain English to policy.
- `packages/llm`: the thin model client.
- `apps/proxy`: tool server, HTTP API, approvals, audit log, PayPal gateway.
- `apps/agent`: demo merchant pages and the shopping agent.
- `apps/web`: the dashboard.
- `attacks`: the attack suite and report generator.

## Quick start

Requirements: Node 22, pnpm 10, Postgres 14 or newer, a PayPal sandbox REST app, and a model API key.

    pnpm install
    createdb paycurb
    cp .env.example .env

Fill in `.env`. Variable names are listed in `.env.example`. Never commit it.

    pnpm migrate
    pnpm proxy
    pnpm --filter @paycurb/agent start
    pnpm --filter @paycurb/web dev

Open http://localhost:3000 and sign in with the owner password from `.env`.

## Tests

    pnpm test
    pnpm typecheck

The proxy tests run against a real Postgres database and a fake PayPal gateway.

## Attack suite

    pnpm attacks

This writes `reports/attack-report.json` and `reports/attack-report.md`. Scripted scenarios call the proxy directly. The prompt injection group runs the real agent against hostile pages, ten trials per scenario and mode, and reports Wilson 95 percent intervals. Numbers in this repository come only from that command.

## Known limitations

- Within policy misuse is not stopped. If a hijacked agent buys the wrong item for an amount the policy allows, the firewall allows it.
- A compromised merchant on the allowlist can still receive purchases that fit the limits.
- The guarantee only holds for payments that pass through the proxy and only if the agent process never has PayPal credentials or tools of its own.
- Sandbox only. No real money, no real cards, no escrow.
- If PayPal fails in a way that does not say whether the charge happened (a timeout or a server error), the call is blocked and the amount stays reserved against the limits until someone checks it. There is no automatic reconciliation.
- The proxy tool endpoint has no caller authentication of its own. It is rate limited per client address, and the guarantee assumes only the intended agent can reach it.
- Attack success and money lost in the report are computed by an oracle inside the suite, not by reading PayPal. The numbers are only as good as that oracle matching the policy.
- The recorded group A trials used a small local model (qwen3:8b through Ollama), ten trials per scenario and mode. They say little about stronger models. In the recorded run the attempt figure was counted by a name based detector and is lower than the money moved figure, see the attack report.
- The policy compiler and the demo agent use a local model by default (`LLM_PROVIDER=ollama`). A hosted model is optional and not what the recorded numbers used.
- The pending approval queue is capped at 50. Past that, further escalations are blocked until the owner decides or approvals expire.

## What was built during the hackathon period

All of it. The repository was created on October 30, 2026 and every package and app was written during the submission period.

## License

MIT

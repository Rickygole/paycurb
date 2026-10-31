# PayPal spike (Day 1)

Status: docs research and a live sandbox run done 2026-10-30, using a dedicated sandbox REST app named Paycurb.

## Confirmed from the official repo README (github.com/paypal/agent-toolkit)

- Auth: the server takes `PAYPAL_ACCESS_TOKEN`. Get it from the OAuth endpoint with the sandbox Client ID and Secret, `grant_type=client_credentials`.
- Environment: `PAYPAL_ENVIRONMENT=SANDBOX` (also the default). TypeScript toolkit: `context: { sandbox: true }`, and it also accepts `clientId` and `clientSecret` directly.
- 43 tools. Money moving or money related:
  - Payments: `create_order`, `pay_order`, `create_refund` (reads: `get_order`, `get_refund`)
  - Invoices: `send_invoice`, `create_invoice`, `record_payment_for_invoice`, `record_refund_for_invoice`, `create_recurring_series`, `activate_recurring_series`, `send_invoice_reminder` (plus read and admin tools)
  - Subscriptions: `create_subscription_plan`, `create_subscription`, `update_subscription`, `cancel_subscription`
  - Disputes: `accept_dispute_claim` (moves money)
  - Read only: `get_order`, `get_refund`, `list_*`, `get_*`, `show_*`, `list_transactions`, `get_merchant_insights`
- Not in the list: no Payouts tool. Payouts are REST only, so the proxy classifies payouts from the REST path or leaves them out.

## Not confirmed (third party sources only)

- Run command `npx -y @paypal/mcp --tools=all`. Confirm the package name on npm before use.
- Remote endpoint `https://mcp.sandbox.paypal.com/sse`.

## Live results (scripts/spike.mjs)

1. OAuth with client credentials returns 200 against api-m.sandbox.paypal.com.
2. Order create returns 201 CREATED with a payer-action approval link. Capture before approval returns 422 ORDER_NOT_APPROVED, so the redirect flow cannot be automated.
3. Order create with `payment_source.card` (test card 4111111111111111) returns 201 and the order is already COMPLETED, with a capture id at `purchase_units[0].payments.captures[0].id`. No redirect. This is option 1 of the buyer approval fallbacks, so the proxy uses it. The capture id is the `paypal_ref`.
4. Refund of that capture via `/v2/payments/captures/{id}/refund` returns 201 COMPLETED. Refunds work in the sandbox.
5. The response does not echo a payee. The proxy must set the payee itself and map it to the merchants registry, never trust the agent.

Consequence: create and capture happen in one call on the card path, so the engine decides once, at create time. Treat `pay_order` as a no-op or a status read on this path.

MCP server check (@paypal/mcp 1.8.1, `--tools=all`, sandbox mode, token auth): 28 tools in this version. Its `create_order` takes `currencyCode`, `items[] {name, itemCost, itemTotal, quantity}`, discount, shipping and return URLs. It has no payment source and no payee field, so every order needs the buyer redirect and `pay_order` (input: `id` only) fails until the buyer approves. `create_refund` takes `capture_id`, `amount`, `invoice_id`, `note_to_payer`.

Decision: the proxy exposes the same tool names and the same `create_order` input shape to the agent, and calls the REST Orders API directly with the test card payment source. The agent-facing schema keeps `itemCost` and `itemTotal` per line, so the engine's stated total versus computed total check (R02) applies as is.

## Decision rule

If the toolkit is unstable or approval blocks automation, call the REST Orders API from the proxy and expose the same tool names. Decide by end of Day 2.

## Classification table seed (default is block)

| Tool | Kind |
|---|---|
| create_order | purchase |
| pay_order | capture |
| create_refund | refund |
| send_invoice | invoice_send |
| create_subscription | subscription_create |
| get_order, get_refund, list_*, get_*, show_* | read_only |
| everything else | block |

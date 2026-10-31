# PayPal spike (Day 1)

Status: docs research done 2026-10-30. Nothing here has been run against the sandbox yet.

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

## Open questions to answer with a real run

1. Does `create_order` return an approval link, and does `pay_order` fail until the buyer approves? Orders v2 normally needs buyer approval before capture.
2. Which payment source (test card) completes without a redirect on this sandbox app?
3. What id does a completed capture return for `paypal_ref`?
4. Are refunds available in the sandbox?

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

# Threat model

## What is protected

Limits on payment actions that pass through the proxy: per transaction size, daily total, spend per merchant in a rolling window, transaction velocity, quantity, merchant allowlist and blocklist, category, currency, recurring payments, duplicates, refunds and payouts.

The claim is that damage from a compromised agent is bounded by the owner's policy. It is not a claim that attacks are prevented or detected.

## Trust boundaries

- Untrusted: the agent, the pages it reads, every tool argument.
- Trusted: the proxy, the engine, the approval service, the audit log, the database.
- PayPal credentials exist only in the proxy's environment.

## Design choices that carry the guarantee

- The model never makes a payment decision. It only turns rules into a policy that the owner confirms, and powers the demo agent.
- Fail closed. An unknown tool, an unparseable payload, a database error, an engine error or a PayPal outage all block.
- Merchant, price and category come from server side data, never from the agent.
- Approvals live only in the database and bind to a hash of the exact payload.
- Spend is reserved inside a locked transaction, so concurrent requests cannot jointly exceed a limit.
- The audit table accepts inserts and reads only from the application role, and each row hashes the previous one.

## What is not protected

- Within policy misuse. If a hijacked agent buys the wrong item for an amount the policy allows, the firewall allows it.
- A compromised merchant on the allowlist can still receive purchases that fit the limits.
- Any route to PayPal that bypasses the proxy. The guarantee holds only if the agent process never has PayPal credentials or tools of its own.
- A malicious owner or someone with database owner access, who can rewrite the log. The hash chain detects edits, it does not prevent a full rewrite by someone who controls the database and recomputes every hash.
- Policy compiler mistakes. The owner sees a deterministic read-back before activation and is responsible for confirming it.

## Scope notes

- Sandbox only. The proxy refuses to start unless `PAYPAL_ENV` is `sandbox`.
- The demo settles every merchant to a single sandbox business account. Merchants differ only in the registry.
- PayPal provides no escrow in this build.

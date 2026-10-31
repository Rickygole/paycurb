# Paycurb

A payment firewall between an AI shopping agent and PayPal. The agent holds no PayPal credentials. Every payment call goes through a deterministic policy engine that returns allow, escalate or block, so a hijacked agent can only spend inside the limits its owner set.

Runs against the PayPal sandbox only.

## Status

- `packages/engine`: pure policy engine (rules R00 to R15), 30 tests, 98.8% branch coverage.
- `docs/paypal-spike.md`: PayPal toolkit findings.

## Develop

    pnpm install
    pnpm test

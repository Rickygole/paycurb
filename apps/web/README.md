# Paycurb dashboard

Next.js App Router dashboard for the Paycurb payment firewall. Screens: Live Feed, Approvals, Policy, Audit Log, Attack Results and Demo Agent, behind a single owner password.

## Run

    pnpm install
    pnpm --filter @paycurb/web dev:mock

`dev:mock` starts a mock proxy on port 4000, a mock agent on port 4100 and the dashboard on http://localhost:3000. The mock password is `demo` unless `OWNER_PASSWORD` is set.

Against the real services:

    PROXY_URL=http://localhost:4000 AGENT_URL=http://localhost:4100 pnpm --filter @paycurb/web dev

`next.config.ts` rewrites `/api/*` to `PROXY_URL/api/*` and `/agent/*` to `AGENT_URL/*`, so the session cookie stays on one origin.

## Mock options

| Variable | Default | Effect |
| --- | --- | --- |
| `MOCK_PROXY_PORT` | 4000 | Mock proxy port |
| `MOCK_AGENT_PORT` | 4100 | Mock agent port |
| `WEB_PORT` | 3000 | Dashboard port for `dev:mock` |
| `MOCK_AUDIT_ROWS` | 200 | Seeded audit rows, try 10000 |
| `MOCK_STREAM_MS` | 5000 | Interval between streamed decisions |
| `MOCK_BREAK_SEQ` | unset | Tamper with one audit row to show a broken chain |
| `MOCK_NO_REPORT` | unset | Start with no attack report |

Mock decisions come from the real policy engine in `@paycurb/engine` and the merchant catalog in `@paycurb/shared`.

## Checks

    pnpm --filter @paycurb/web typecheck
    pnpm --filter @paycurb/web lint
    pnpm --filter @paycurb/web test
    pnpm --filter @paycurb/web build

The audit table uses AG Grid Community with the client side row model. Rows are appended page by page from `/api/audit?cursor=` until the server returns no cursor.

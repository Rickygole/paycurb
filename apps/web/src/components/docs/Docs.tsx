import "../ledger.css";
import "./docs.css";
import Link from "next/link";
import { LogoGlyph } from "../Logo";
import { ThemeToggle } from "../ThemeToggle";
import { Code } from "./Code";
import { endpoints } from "./endpoints";
import { fields, fieldValue, strictDefault, workspaceDefault } from "./policy";

const repo = "https://github.com/Rickygole/paycurb";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "quickstart", label: "Quickstart" },
  { id: "policies", label: "Policies" },
  { id: "approvals", label: "Approvals" },
  { id: "audit", label: "Audit log" },
  { id: "api", label: "API reference" },
  { id: "mcp", label: "MCP tools" },
  { id: "limits", label: "Limits and threat model" },
];

const json = (value: unknown) => JSON.stringify(value, null, 2);

const tools = [
  {
    name: "create_order",
    kind: "Purchase, checked by every spending rule",
    text: "Create and pay a PayPal order for items from one merchant. Costs are in dollars. Required: currencyCode (USD), payee, items. Each item needs name, quantity, itemCost and itemTotal, and may carry sku. Pass approval_id when repeating a held call.",
  },
  { name: "get_order", kind: "Read only, always allowed", text: "Look up a PayPal order by id. Required: id." },
  {
    name: "create_refund",
    kind: "Refund, follows the refunds field",
    text: "Refund part or all of a captured payment. Required: capture_id and amount in dollars, optional note_to_payer. A refund larger than what is left of the purchase is blocked.",
  },
];

const lamp = {
  currencyCode: "USD",
  payee: "acme-office@merchants.example",
  items: [{ sku: "LAMP-1", name: "Desk Lamp", quantity: 1, itemCost: 75, itemTotal: 75 }],
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="doc-section" aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>{title}</h2>
      {children}
    </section>
  );
}

export function Docs({ endpoint }: { endpoint: string }) {
  const config = json({ mcpServers: { paycurb: { type: "http", url: endpoint, headers: { "x-agent-id": "office-agent" } } } });
  const call = json({ name: "create_order", arguments: lamp });
  const held = json({ decision: "escalate", rule_id: "R14", reason: "Needs approval: $75.00 is at or above the $50.00 auto-approve line", approval_id: "APPROVAL_ID" });
  const curl = `curl -s ${endpoint} \\\n  -H 'content-type: application/json' \\\n  -H 'accept: application/json, text/event-stream' \\\n  -H 'x-agent-id: office-agent' \\\n  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`;

  return (
    <div className="ledger docs">
      <a href="#docs-main" className="skip-link">
        Skip to content
      </a>
      <header className="topbar">
        <div className="col topbar-inner">
          <Link href="/" className="brand" aria-label="Paycurb home">
            <span className="mark">
              <LogoGlyph size={20} />
            </span>
            Paycurb
          </Link>
          <nav aria-label="Site" className="nav">
            <Link href="/docs" className="nav-link" aria-current="page">
              Docs
            </Link>
            <Link href="/connect" className="nav-link">
              Connect
            </Link>
          </nav>
          <div className="bar-end">
            <ThemeToggle />
            <Link href="/login" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <div className="col docs-layout">
        <nav aria-label="Documentation" className="docs-nav">
          <p className="small muted">On this page</p>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        <main id="docs-main" className="docs-main">
          <header className="docs-head">
            <h1 className="title">Paycurb documentation</h1>
            <p className="lede">How the proxy decides, what each policy field does, and every endpoint it serves. Everything here is read from the code that runs.</p>
          </header>

          <Section id="overview" title="Overview">
            <p>
              Paycurb is a payment firewall for AI agents that pay through PayPal. Your agent calls Paycurb&apos;s MCP tools instead of PayPal&apos;s. Before any money moves, the
              proxy reads the merchant, prices and category from its own registry, checks the order against your policy, and only then calls PayPal.
            </p>
            <p>Every call ends in one of three outcomes, and each one carries a rule id and a plain English reason the agent can pass on.</p>
            <dl className="outcomes">
              <div>
                <dt>
                  <span className="status status-allow">Allowed</span>
                </dt>
                <dd>Within policy. The order goes to the PayPal sandbox and the answer carries the order id and capture id.</dd>
              </div>
              <div>
                <dt>
                  <span className="status status-held">Held</span>
                </dt>
                <dd>Nothing is paid yet. The order waits on the approvals page until you approve it, reject it, or it expires.</dd>
              </div>
              <div>
                <dt>
                  <span className="status status-block">Blocked</span>
                </dt>
                <dd>Nothing reaches PayPal. The rule that stopped it is in rule_id and the block is written to the audit log.</dd>
              </div>
            </dl>
            <p className="small muted">This workspace is a shared sandbox. It only talks to the PayPal sandbox, and nothing in it moves real money.</p>
          </Section>

          <Section id="quickstart" title="Quickstart">
            <ol className="steps">
              <li>
                <strong>Write your policy in plain English.</strong> On the <Link href="/policy">policy page</Link>, describe limits in dollars, the merchants you trust and what needs
                your approval. A model drafts the policy, you read it back, and nothing applies until you activate it.
              </li>
              <li>
                <strong>Connect your agent.</strong> Add Paycurb as an MCP server. The x-agent-id header names the agent in the log; without it the agent is recorded as demo-agent.
              </li>
              <li>
                <strong>Send a first payment request.</strong> Have the agent call create_order. The decision shows up on the <Link href="/feed">feed</Link> within a second.
              </li>
              <li>
                <strong>Approve a held order.</strong> Orders at or above your approval line wait on the <Link href="/approvals">approvals page</Link>. Approve one and the proxy pays it.
              </li>
            </ol>
            <Code label="MCP client config" code={config} />
            <Code label="List the tools with curl" code={curl} />
          </Section>

          <Section id="policies" title="Policies">
            <p>
              A policy is one JSON object checked against a strict schema. You write it in plain English and the compiler turns it into these fields. Anything you did not say
              gets the strict default, so a short policy is a tight one. The compiler asks a question instead of guessing when a rule is ambiguous, and the read back is built
              from the fields themselves, not from the model.
            </p>
            <p>
              Amounts are in cents. The workspace starts on version 1, the default policy below. If you allow merchants but name no categories, the categories of those
              merchants are allowed.
            </p>
            <div className="doc-table" role="region" aria-label="Policy fields" tabIndex={0}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">What it does</th>
                    <th scope="col">Rule</th>
                    <th scope="col">Workspace default</th>
                    <th scope="col">Strict default</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field.key}>
                      <th scope="row">
                        <code>{field.key}</code>
                      </th>
                      <td>{field.meaning}</td>
                      <td className="mono" data-label="Rule">
                        {field.rule}
                      </td>
                      <td data-label="Workspace default">{fieldValue(workspaceDefault, field.key)}</td>
                      <td data-label="Strict default">{fieldValue(strictDefault, field.key)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Code
              label="Plain English the compiler accepts"
              code="Spend at most $200 per day. Allow up to $100 per purchase. Ask me before any purchase of $50 or more. Only buy from Paper Co. Never allow payouts."
            />
            <Code label="The workspace default policy" code={json(workspaceDefault)} />
            <p className="small muted">
              Rules are checked in order: currency (R01), amount and line items (R02), recurring (R03), merchant lists (R04), category (R05), per payment limit (R06), daily
              limit (R07), merchant window (R08), velocity (R09), quantity (R10). Then a passing purchase can still be held: duplicate (R11), refund or payout (R12), merchant
              not on the allowlist (R13), at or above the approval line (R14). R00 is a fail closed block and R99 is allowed.
            </p>
          </Section>

          <Section id="approvals" title="Approvals">
            <ul className="facts">
              <li>
                <strong>Bound to the exact order.</strong> A hold is stored with a hash of the whole tool call. A different merchant, item, quantity or amount is a new order and is
                checked again from the start.
              </li>
              <li>
                <strong>Executed by the proxy on approve.</strong> When you approve, the proxy sends the held call to PayPal itself and records the status and PayPal reference
                on the approval. The agent does not need to call again.
              </li>
              <li>
                <strong>Used once.</strong> After it pays, the approval is marked executed. A call that passes the same approval_id again is blocked with R15.
              </li>
              <li>
                <strong>Expires.</strong> A hold waits approval_ttl_minutes: 1440 minutes, 24 hours, in the workspace default policy, and 15 minutes for a compiled policy that
                does not set it. An expired hold is never paid.
              </li>
              <li>
                <strong>Capped.</strong> At most 50 holds can wait at once. Past that, new holds are blocked with R16, so a runaway agent cannot flood the queue.
              </li>
            </ul>
            <p>An agent that repeats a held call before you decide gets the same hold back with its approval_id.</p>
            <Code label="A held answer" code={held} />
          </Section>

          <Section id="audit" title="Audit log">
            <p>
              Every decision, approval, policy activation and reset is appended to the audit log. Each row stores the hash of the row before it, and its own hash is SHA-256
              over that previous hash and the row&apos;s canonical JSON. The first row chains from 64 zeros.
            </p>
            <p>
              GET /api/audit/verify walks the whole log from the first row and recomputes every hash. It answers ok with the number of rows checked, or the sequence number of
              the first row that does not match. Reasons are redacted before they are written, and the application role can only insert and read the table.
            </p>
            <Code label="Verify response" code={json({ ok: true, checked: 214, first_broken_seq: null })} />
          </Section>

          <Section id="api" title="API reference">
            <p>
              The dashboard and the proxy share an origin, so /api calls carry the session cookie. Routes marked session answer 401 with {"{ \"error\": \"login required\" }"} without
              it. Errors are JSON with an error field.
            </p>
            {endpoints.map((group) => (
              <div key={group.group} className="doc-group">
                <h3>{group.group}</h3>
                <ul className="endpoints">
                  {group.items.map((item) => (
                    <li key={`${item.method} ${item.path}`}>
                      <p className="endpoint-line">
                        <span className="method mono">{item.method}</span>
                        <code>{item.path}</code>
                        <span className={item.auth === "session" ? "auth auth-session" : "auth"}>{item.auth === "session" ? "Session" : "No auth"}</span>
                      </p>
                      <p>{item.summary}</p>
                      <pre className="code-block">{item.response}</pre>
                      {item.errors && <p className="small muted">Errors: {item.errors}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

          <Section id="mcp" title="MCP tools">
            <p>
              The /mcp endpoint speaks MCP over streamable HTTP with JSON responses. Tool names match the PayPal agent toolkit. Every result is one text block holding JSON with
              decision, rule_id and reason, plus order, refund or approval_id when they apply. Any other tool name is blocked with R00.
            </p>
            <ul className="tools">
              {tools.map((tool) => (
                <li key={tool.name}>
                  <h3>
                    <code>{tool.name}</code>
                  </h3>
                  <p className="small muted">{tool.kind}</p>
                  <p>{tool.text}</p>
                </li>
              ))}
            </ul>
            <Code label="create_order call" code={call} />
          </Section>

          <Section id="limits" title="Limits and threat model">
            <p>
              Paycurb bounds what a compromised agent can spend for payments that pass through the proxy. It does not stop misuse inside your policy, and it cannot see a route
              to PayPal that skips the proxy.
            </p>
            <ul className="facts">
              <li>The /mcp endpoint has no caller authentication. Anyone who can reach it can ask for payments, limited by the policy and the rate limit.</li>
              <li>After a PayPal timeout or server error the call is blocked and the amount stays reserved, but PayPal may have charged. Nothing reconciles this automatically.</li>
              <li>The hash chain detects edits. It does not stop someone with database owner access from rewriting the whole log.</li>
              <li>The proxy refuses to start unless PAYPAL_ENV is sandbox.</li>
            </ul>
            <p>
              <a href={`${repo}/blob/main/docs/threat-model.md`}>Read the full threat model on GitHub</a>
            </p>
          </Section>
        </main>
      </div>
    </div>
  );
}

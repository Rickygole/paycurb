import { hashPayload } from "@paycurb/shared";
import { Header } from "./Header";
import { OpenDemo } from "./OpenDemo";
import { Picker } from "./Picker";
import { Reveal } from "./Reveal";
import { dollars, loadReport } from "./data";
import "./landing.css";

const lampPayload = {
  tool: "create_order",
  args: { currencyCode: "USD", payee: "acme-office@merchants.example", items: [{ sku: "LAMP-1", name: "Desk lamp", quantity: 1, itemCost: 75, itemTotal: 75 }] },
};

const attackNames = [
  "Prompt injection",
  "Split purchases",
  "Approval tampering",
  "Replayed approval",
  "Negative amount",
  "Currency swap",
  "Unknown tool",
  "Duplicate order",
  "Refund abuse",
  "Oversized payload",
  "Parallel requests",
  "Stale approval",
];

const repo = "https://github.com/Rickygole/paycurb";

const chainRows = [
  { seq: 6, time: "03:44:54", what: "Chronos X watch", merchant: "Luxury Watches", amount: "$400.00", decision: "block", rule: "R04", entry: "64a66321", prev: "f18d50ea" },
  { seq: 7, time: "03:44:54", what: "Desk lamp", merchant: "Acme Office Supply", amount: "$75.00", decision: "escalate", rule: "R14", entry: "b2906346", prev: "64a66321" },
  { seq: 8, time: "03:44:54", what: "Desk lamp, resent", merchant: "Acme Office Supply", amount: "$450.00", decision: "block", rule: "R06", entry: "93972432", prev: "b2906346" },
  { seq: 9, time: "03:44:54", what: "Owner approval", merchant: "Acme Office Supply", amount: "$75.00", decision: "allow", rule: "R14", entry: "b51d17c0", prev: "93972432" },
  { seq: 10, time: "03:44:54", what: "Desk lamp", merchant: "Acme Office Supply", amount: "$75.00", decision: "allow", rule: "R99", entry: "9c8e2e35", prev: "b51d17c0" },
  { seq: 11, time: "03:44:58", what: "Desk lamp paid", merchant: "Acme Office Supply", amount: "$75.00", decision: "allow", rule: "R99", entry: "7aabbf79", prev: "9c8e2e35" },
  { seq: 12, time: "03:44:58", what: "transfer_funds", merchant: "Unknown tool", amount: "-", decision: "block", rule: "R00", entry: "868af507", prev: "7aabbf79" },
] as const;

const stopped = [
  { what: "Chronos X watch", reason: "luxury-watches.example is not an approved merchant", amount: "$400.00" },
  { what: "Desk lamp, resent bigger", reason: "$450.00 exceeds the $100.00 per-transaction limit", amount: "$450.00" },
  { what: "transfer_funds", reason: "transfer_funds is not a tool your policy allows", amount: "-" },
];

const decisionWords = { allow: "Allowed", escalate: "Held", block: "Blocked" } as const;

function Ticket({ children }: { children: React.ReactNode }) {
  return (
    <div className="ticket" data-ui>
      <p className="ticket-merchant">Acme Office Supply</p>
      <p className="ticket-item">Desk lamp</p>
      <p className="ticket-amount">$75.00</p>
      {children}
    </div>
  );
}

export function Landing() {
  const report = loadReport();
  const hash = hashPayload(lampPayload).slice(0, 10);
  const head = report?.headline;

  return (
    <div className="site" id="top">
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("js")' }} />
      <Header />
      <main>
        <section className="field hero" data-chapter data-ink="dark" aria-labelledby="hero-title">
          <h1 id="hero-title" className="statement">
            <span className="line line-a">
              <span>A budget,</span>
            </span>
            <span className="line line-b">
              <span>not a card.</span>
            </span>
          </h1>
          <p className="support">Paycurb is a payment firewall between an AI shopping agent and PayPal. A hijacked agent can only spend what you allow.</p>
        </section>

        {head && (
          <section className="field stats" data-chapter data-ink="dark" aria-labelledby="stats-title">
            <Reveal as="h2" className="stats-title">
              <span id="stats-title">Attacks that got through</span>
            </Reveal>
            <Reveal className="stats-figure" delay={120}>
              <p className="figure" aria-label={`${head.protected_success} of ${head.attack_scenarios}`}>
                {head.protected_success}
                <sup>of {head.attack_scenarios}</sup>
              </p>
              <p className="caption">
                {head.attack_scenarios} scripted attack scenarios, run against the PayPal sandbox. With Paycurb in the way, {head.protected_success} moved money past the owner&apos;s limits. Without it, {head.baseline_success} did, moving{" "}
                {dollars(head.money_lost_baseline_cents)}.
              </p>
            </Reveal>
            <Reveal className="stats-side" delay={240}>
              <ul className="feed" data-ui aria-label="Calls stopped before PayPal, from a real test run">
                {stopped.map((row) => (
                  <li key={row.what} className="feed-row">
                    <span className="pill pill-block">Blocked</span>
                    <div className="feed-text">
                      <p className="what">{row.what}</p>
                      <p className="merchant">{row.reason}</p>
                    </div>
                    <span className="route" aria-hidden="true">
                      <i />
                      <b />
                      <i />
                      <b className="cut" />
                      <i className="ring" />
                      <em className="packet" />
                    </span>
                    <span className="amt">{row.amount}</span>
                  </li>
                ))}
              </ul>
              <p className="source">Rows from a real run. The route shows where each call stopped: before PayPal.</p>
            </Reveal>
          </section>
        )}

        <section className="strip" data-chapter data-ink="mixed" aria-labelledby="path-title">
          <div className="cell cell-1">
            <Reveal as="h2" className="strip-title">
              <span id="path-title">One order&apos;s path</span>
            </Reveal>
            <Reveal delay={100}>
              <Ticket>
                <p className="ticket-status">From the agent</p>
              </Ticket>
            </Reveal>
            <Reveal as="p" className="clause" delay={200}>
              First the agent asks.
            </Reveal>
          </div>
          <div className="cell cell-2">
            <Reveal delay={180}>
              <Ticket>
                <p className="ticket-status ticket-held">Held for you</p>
                <p className="ticket-note">$75.00 is at or above your $50.00 line. Rule R14.</p>
              </Ticket>
            </Reveal>
            <Reveal as="p" className="clause" delay={280}>
              Then your rules decide.
            </Reveal>
          </div>
          <div className="cell cell-3">
            <Reveal delay={260}>
              <Ticket>
                <p className="ticket-status ticket-ok">Approved by you</p>
                <p className="ticket-note">Bound to this exact order, fingerprint {hash}.</p>
              </Ticket>
            </Reveal>
            <Reveal as="p" className="clause" delay={360}>
              You approve that exact order.
            </Reveal>
          </div>
          <div className="cell cell-4">
            <Reveal delay={340}>
              <Ticket>
                <p className="ticket-status ticket-ok">Paid</p>
                <p className="ticket-note">PayPal sandbox reference 0F4626979R705464G, written to the audit chain.</p>
              </Ticket>
            </Reveal>
            <Reveal as="p" className="clause" delay={440}>
              Then it is paid and chained.
            </Reveal>
          </div>
        </section>

        <Picker />

        <section className="field chain" data-chapter data-ink="dark" aria-labelledby="chain-title">
          <Reveal className="chain-copy">
            <h2 id="chain-title">Every decision is chained.</h2>
            <p>
              Each entry carries the fingerprint of the one before it, so changing any past row breaks every row after it. These are real rows from a test run against the PayPal sandbox.
            </p>
          </Reveal>
          <Reveal className="chain-table" delay={120}>
            <div className="ledger" data-ui>
              <p className="ledger-badge">Chain verified, 12 entries</p>
              <table>
                <caption className="visually-hidden">Audit log entries, each with the fingerprint of the previous entry</caption>
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">What</th>
                    <th scope="col" className="num hide-phone">
                      Amount
                    </th>
                    <th scope="col">Decision</th>
                    <th scope="col" className="hide-small">
                      Rule
                    </th>
                    <th scope="col">Entry</th>
                    <th scope="col" className="hide-small">
                      Follows
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {chainRows.map((row, position) => (
                    <tr key={row.seq} style={{ "--i": position } as React.CSSProperties}>
                      <td className="num">{row.seq}</td>
                      <td>
                        <span className="what">{row.what}</span>
                        <span className="merchant">{row.merchant}</span>
                      </td>
                      <td className="num hide-phone">{row.amount}</td>
                      <td>
                        <span className={`pill pill-${row.decision}`}>{decisionWords[row.decision]}</span>
                      </td>
                      <td className="hide-small">{row.rule}</td>
                      <td className="hash">{row.entry}</td>
                      <td className="hash hide-small">{row.prev}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <section className="band-wrap" data-chapter data-ink="light" aria-labelledby="band-title">
          <h2 id="band-title" className="visually-hidden">
            The kinds of attack in the suite
          </h2>
          <div className="band" aria-hidden="true">
            <div className="track">
              {[0, 1].map((copy) => (
                <ul key={copy} className="names">
                  {attackNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
          <Reveal as="div" className="band-note">
            <p>
              Each name is a scenario file in the repository, run twice against PayPal: once paying directly, once through Paycurb. The suite also lists what it cannot stop: a wrong item at an allowed merchant, and a trusted merchant gone bad.{" "}
              <a href={`${repo}/blob/main/reports/attack-report.md`}>Read the full report.</a>
            </p>
          </Reveal>
        </section>

        <section id="open" className="field cta" data-chapter data-ink="light" aria-labelledby="cta-title">
          <Reveal className="cta-copy">
            <h2 id="cta-title">Try to break it.</h2>
            <p>Sign in with the demo password and watch decisions arrive live. It is a sandbox, so every payment is play money and anything you do can be reset.</p>
          </Reveal>
          <Reveal className="cta-dialog" delay={140}>
            <OpenDemo />
          </Reveal>
        </section>
      </main>

      <footer className="foot" data-chapter data-ink="light">
        <p className="name" aria-hidden="true">
          paycurb
        </p>
        <div className="foot-grid">
          <ul className="places">
            <li>
              <a href={repo}>GitHub repository</a>
            </li>
            <li>
              <a href={`${repo}/blob/main/docs/architecture.md`}>How it works</a>
            </li>
            <li>
              <a href={`${repo}/blob/main/docs/threat-model.md`}>What it does not stop</a>
            </li>
          </ul>
          <div className="links">
            <ul>
              <li>
                <a href="#try">Try to overspend</a>
              </li>
              <li>
                <a href="#open">Open the live demo</a>
              </li>
              <li>
                <a href="/login">Sign in</a>
              </li>
            </ul>
            <ul>
              <li>
                <a href={`${repo}/blob/main/README.md`}>Readme</a>
              </li>
              <li>
                <a href={`${repo}/blob/main/docs/contracts.md`}>Interfaces</a>
              </li>
              <li>
                <a href={`${repo}/blob/main/docs/paypal-spike.md`}>PayPal findings</a>
              </li>
            </ul>
          </div>
        </div>
        <p className="legal">
          <span>MIT license. PayPal sandbox only, no real money moves.</span>
          <a href="#top">Back to top</a>
        </p>
      </footer>
    </div>
  );
}

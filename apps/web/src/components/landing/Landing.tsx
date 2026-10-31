import { hashPayload } from "@paycurb/shared";
import { chainRows, decisionWords } from "./chain";
import { Gate } from "./Gate";
import { Header } from "./Header";
import { OpenDemo } from "./OpenDemo";
import { Picker } from "./Picker";
import { Reveal } from "./Reveal";
import { Tick } from "./Tick";
import { dollars, loadReport } from "./data";
import { decide, scenarios } from "./scenarios";
import "./landing.css";

const lampPayload = {
  tool: "create_order",
  args: { currencyCode: "USD", payee: "acme-office@merchants.example", items: [{ sku: "LAMP-1", name: "Desk lamp", quantity: 1, itemCost: 75, itemTotal: 75 }] },
};

const groupNames: Record<string, string> = {
  A: "Prompt injection through page content",
  B: "Split purchases and velocity",
  C: "Approval tampering and replay",
  D: "Numeric and currency tricks",
  E: "Refund and payout abuse",
  F: "Malformed calls and unknown tools",
  G: "Retries and duplicate orders",
};

const repo = "https://github.com/Rickygole/paycurb";
const threatModel = `${repo}/blob/main/docs/threat-model.md`;

export function Landing() {
  const report = loadReport();
  const head = report?.headline;
  const attacks = report?.groups.filter((group) => groupNames[group.group]) ?? [];
  const control = report?.groups.find((group) => group.group === "H");
  const hash = hashPayload(lampPayload).slice(0, 10);
  const lamp = scenarios.find((item) => item.id === "lamp");
  const lampDecision = lamp ? decide(lamp) : null;

  return (
    <div className="site" id="top">
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("js")' }} />
      <Header threatModel={threatModel} />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title" className="statement">
              <span className="line">
                <span>A payment firewall</span>
              </span>
              <span className="line line-b">
                <span>for AI agents.</span>
              </span>
            </h1>
            <div className="hero-side">
              <p className="support">Paycurb sits between an untrusted agent and PayPal. Deterministic rules allow, hold or block every payment call before PayPal sees it, so a hijacked agent can only spend what you allow.</p>
              <div className="actions">
                <a className="btn btn-solid" href="#open">
                  Open the live demo
                </a>
                <a className="btn btn-quiet" href={threatModel}>
                  Read the threat model
                </a>
              </div>
            </div>
          </div>
          <div className="hero-gate">
            <Gate />
          </div>
        </section>

        <section id="how" className="band how" aria-labelledby="how-title">
          <Reveal className="band-head">
            <h2 id="how-title">How a payment gets through</h2>
            <p>The agent never holds PayPal credentials. It can only ask, and every ask goes through the same engine.</p>
          </Reveal>
          <ol className="steps">
            <Reveal as="li" className="step" delay={0}>
              <h3>The agent proposes.</h3>
              <p>A tool call arrives with the merchant, items and total it wants to pay.</p>
              <pre className="panel" data-ui>
                <code>{JSON.stringify(lampPayload, null, 2)}</code>
              </pre>
            </Reveal>
            <Reveal as="li" className="step" delay={90}>
              <h3>Paycurb decides.</h3>
              <p>Sixteen deterministic rules, R00 to R15, run in order. No model is asked. Approvals bind to fingerprint {hash}.</p>
              {lampDecision && (
                <pre className="panel" data-ui>
                  <code>{JSON.stringify(lampDecision, null, 2)}</code>
                </pre>
              )}
            </Reveal>
            <Reveal as="li" className="step" delay={180}>
              <h3>PayPal executes, only if allowed.</h3>
              <p>Allowed calls go to the PayPal sandbox. Held calls wait for you. Blocked calls never leave.</p>
              <dl className="panel panel-facts" data-ui>
                <div>
                  <dt>PayPal sandbox order</dt>
                  <dd>
                    <code>0F4626979R705464G</code>
                  </dd>
                </div>
                <div>
                  <dt>Audit entry</dt>
                  <dd>
                    <code>7aabbf79</code>
                  </dd>
                </div>
                <div>
                  <dt>Follows</dt>
                  <dd>
                    <code>9c8e2e35</code>
                  </dd>
                </div>
              </dl>
            </Reveal>
          </ol>
        </section>

        <Picker />

        {head && (
          <section id="stops" className="band stops" aria-labelledby="stops-title">
            <Reveal className="stops-copy">
              <h2 id="stops-title">What it stops</h2>
              <p className="figure" aria-label={`${head.protected_success} of ${head.attack_scenarios} attacks moved money with Paycurb`}>
                <span className="num">{head.protected_success}</span>
                <span className="figure-of">of {head.attack_scenarios}</span>
              </p>
              <p>
                {head.attack_scenarios} scripted attacks against the PayPal sandbox. With Paycurb in the way, {head.protected_success} moved money past the owner&apos;s limits. Paying PayPal directly,{" "}
                <span className="num">
                  <Tick value={head.baseline_success} />
                  <span className="visually-hidden">{head.baseline_success}</span>
                </span>{" "}
                did, moving <span className="num">{dollars(head.money_lost_baseline_cents)}</span>.
              </p>
              {control && (
                <p className="note">
                  All {control.protected_success} of {control.scenarios} legitimate control purchases still went through.
                </p>
              )}
            </Reveal>
            <Reveal className="stops-table" delay={120}>
              <div className="sheet" data-ui>
                <table>
                  <caption className="visually-hidden">Attack groups, how many moved money without and with Paycurb</caption>
                  <thead>
                    <tr>
                      <th scope="col">Attack</th>
                      <th scope="col" className="num">
                        Direct
                      </th>
                      <th scope="col" className="num">
                        Paycurb
                      </th>
                      <th scope="col" className="num hide-phone">
                        Lost direct
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attacks.map((group) => (
                      <tr key={group.group}>
                        <td>{groupNames[group.group]}</td>
                        <td className="num">
                          {group.baseline_success} of {group.scenarios}
                        </td>
                        <td className="num ok">
                          {group.protected_success} of {group.scenarios}
                        </td>
                        <td className="num hide-phone">{dollars(group.money_lost_baseline_cents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="limits">
                <strong>Limits.</strong> The suite also records what still gets through by design. {report?.limitations.map((item) => `${item.description}.`).join(" ")} Any route to PayPal that bypasses the proxy is out of scope. <a href={threatModel}>Read the threat model.</a>
              </p>
            </Reveal>
          </section>
        )}

        <section id="chain" className="band chain" aria-labelledby="chain-title">
          <Reveal className="band-head">
            <h2 id="chain-title">Every decision is chained.</h2>
            <p>Each entry carries the fingerprint of the one before it, so changing any past row breaks every row after it. These are real rows from a test run against the PayPal sandbox.</p>
          </Reveal>
          <Reveal className="chain-table" delay={120}>
            <div className="sheet" data-ui>
              <p className="table-badge">Chain verified, 12 entries</p>
              <table>
                <caption className="visually-hidden">Audit log entries, each with the fingerprint of the previous entry</caption>
                <thead>
                  <tr>
                    <th scope="col" className="num">
                      Seq
                    </th>
                    <th scope="col" className="hide-small">
                      Time
                    </th>
                    <th scope="col">What</th>
                    <th scope="col" className="num hide-phone">
                      Amount
                    </th>
                    <th scope="col">Decision</th>
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
                      <td className="num hide-small">{row.time}</td>
                      <td>
                        <span className="what">{row.what}</span>
                        <span className="merchant">{row.merchant}</span>
                      </td>
                      <td className="num hide-phone">{row.amount}</td>
                      <td>
                        <span className={`pill pill-${row.decision}`}>
                          {decisionWords[row.decision]} {row.rule}
                        </span>
                      </td>
                      <td>
                        <code>{row.entry}</code>
                      </td>
                      <td className="hide-small">
                        <code>{row.prev}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        <section id="open" className="band cta" aria-labelledby="cta-title">
          <Reveal className="cta-copy">
            <h2 id="cta-title">Try to break it.</h2>
            <p>Sign in with the public demo password and watch decisions arrive live. It runs against the PayPal sandbox, so every payment is play money and anything you do can be reset.</p>
          </Reveal>
          <Reveal className="cta-dialog" delay={120}>
            <OpenDemo />
          </Reveal>
        </section>
      </main>

      <footer className="foot">
        <div className="foot-grid">
          <p className="mark">paycurb</p>
          <ul>
            <li>
              <a href={repo}>GitHub repository</a>
            </li>
            <li>
              <a href={`${repo}/blob/main/docs/architecture.md`}>Architecture</a>
            </li>
            <li>
              <a href={threatModel}>Threat model</a>
            </li>
          </ul>
          <ul>
            <li>
              <a href={`${repo}/blob/main/reports/attack-report.md`}>Attack report</a>
            </li>
            <li>
              <a href={`${repo}/blob/main/docs/contracts.md`}>Interfaces</a>
            </li>
            <li>
              <a href={`${repo}/blob/main/docs/paypal-spike.md`}>PayPal findings</a>
            </li>
          </ul>
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
        </div>
        <p className="legal">
          <span>MIT license. PayPal sandbox only, no real money moves.</span>
          <a href="#top">Back to top</a>
        </p>
      </footer>
    </div>
  );
}

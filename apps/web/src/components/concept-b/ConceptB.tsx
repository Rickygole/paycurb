import { CopyButton } from "../CopyButton";
import { CheckIcon, ClockIcon, GateMark, StopIcon } from "../icons";
import { chainRows } from "../landing/chain";
import { dollars, loadReport } from "../landing/data";
import { demoPolicy } from "../landing/scenarios";
import { Tick } from "../landing/Tick";
import { toFacts, type ReportWithLatency } from "./facts";
import { lampDecision, lampPayload, paypalReference, story } from "./heroData";
import { HeroWindow } from "./HeroWindow";
import { Tour, type TourStep } from "./Tour";
import "./concept-b.css";

const repo = "https://github.com/Rickygole/paycurb";
const threatModel = `${repo}/blob/main/docs/threat-model.md`;
const askLine = dollars(demoPolicy.auto_approve_below_cents);
const perOrder = dollars(demoPolicy.per_transaction_limit_cents);
const paid = chainRows.find((row) => row.seq === 11);

const connectConfig = `{
  "mcpServers": {
    "paypal": {
      "url": "https://your-paycurb-host/mcp"
    }
  }
}`;

const lampChecks: { rule: string; text: string; held?: boolean }[] = [
  { rule: "R00", text: "create_order is a tool you allow" },
  { rule: "R01", text: "Paid in USD" },
  { rule: "R02", text: "Total matches the line items" },
  { rule: "R04", text: "Acme Office Supply is on your list" },
  { rule: "R05", text: "Office supplies are allowed" },
  { rule: "R06", text: `Under the ${perOrder} per order limit` },
  { rule: "R07", text: "Inside today's budget" },
  { rule: lampDecision.rule_id, text: `${story.lamp.amount} is at or above your ${askLine} ask line`, held: true },
];

function AskFigure() {
  return (
    <div className="cb-fig-card">
      <p className="cb-fig-head">
        <span className="cb-who">Shopping agent</span>
        <span>calls</span>
        <code>create_order</code>
      </p>
      <pre className="cb-code">
        <code>{JSON.stringify(lampPayload.args, null, 2)}</code>
      </pre>
      <p className="cb-fig-foot">Sent to Paycurb. PayPal has not seen it.</p>
    </div>
  );
}

function DecideFigure({ latency }: { latency: string | null }) {
  return (
    <div className="cb-fig-card">
      <ul className="cb-checks">
        {lampChecks.map((check) => (
          <li key={check.rule} data-held={check.held ?? false}>
            {check.held ? <ClockIcon size={15} /> : <CheckIcon size={15} />}
            <code>{check.rule}</code>
            <span>{check.text}</span>
          </li>
        ))}
      </ul>
      <pre className="cb-code cb-code-held">
        <code>{JSON.stringify(lampDecision, null, 2)}</code>
      </pre>
      {latency && <p className="cb-fig-foot">Median time the proxy adds: {latency} ms. No model is asked.</p>}
    </div>
  );
}

function PayFigure() {
  return (
    <div className="cb-fig-card">
      <div className="cb-paid">
        <span className="cb-pill cb-pill-allow">
          <CheckIcon size={13} />
          Approved by you
        </span>
        <p className="cb-paid-amt cb-fig">{story.lamp.amount}</p>
        <p>Desk lamp, {story.lamp.merchant}</p>
      </div>
      <dl className="cb-facts-list">
        <div>
          <dt>PayPal sandbox order</dt>
          <dd>
            <code>{paypalReference}</code>
          </dd>
        </div>
        <div>
          <dt>Audit entry {paid?.seq}</dt>
          <dd>
            <code>{paid?.entry}</code>
          </dd>
        </div>
        <div>
          <dt>Follows entry {paid ? paid.seq - 1 : ""}</dt>
          <dd>
            <code>{paid?.prev}</code>
          </dd>
        </div>
      </dl>
      <p className="cb-fig-foot">Change any earlier row and every hash after it stops matching.</p>
    </div>
  );
}

export function ConceptB() {
  const facts = toFacts(loadReport() as ReportWithLatency | null);

  const steps: TourStep[] = [
    {
      id: "ask",
      title: "The agent asks.",
      body: (
        <p>
          Your agent calls <code>create_order</code>, the same tool name PayPal&apos;s agent toolkit uses, so it works unchanged. It holds no PayPal keys. Asking is all it can do.
        </p>
      ),
      figure: <AskFigure />,
    },
    {
      id: "decide",
      title: "Paycurb decides.",
      body: (
        <p>
          Fixed rules run in order, R00 to R15. The lamp passes the merchant, category and limit checks, then stops at {lampDecision.rule_id}: you asked to approve anything at {askLine} or more yourself.
        </p>
      ),
      figure: <DecideFigure latency={facts?.latency ?? null} />,
    },
    {
      id: "pay",
      title: "PayPal pays.",
      body: <p>You tap Approve. Paycurb sends the exact order it held to the PayPal sandbox, records the reference and chains the entry to the one before it.</p>,
      figure: <PayFigure />,
    },
  ];

  const beats = [
    `A hostile page sells it a ${story.watch.amount} watch. Blocked before PayPal.`,
    `It wants a ${story.lamp.amount} lamp. Held, since you approve anything over ${askLine}.`,
    `It resends the lamp at ${story.resent.amount}. Blocked by the per order limit.`,
    "You tap Approve on your phone.",
    "PayPal is paid, and the log links the entry to the one before.",
  ];

  return (
    <div className="cb" id="top">
      <a className="cb-skip" href="#main">
        Skip to content
      </a>
      <header className="cb-bar">
        <div className="cb-col cb-bar-in">
          <a className="cb-brand" href="#top" aria-label="Paycurb, back to the top">
            <GateMark size={20} />
            Paycurb
          </a>
          <nav className="cb-links-nav" aria-label="Page">
            <a href="#tour">How it works</a>
            <a href="#results">Results</a>
            <a href="#compare">Versus cards</a>
            <a href="#connect">Developers</a>
          </nav>
          <a className="cb-btn cb-btn-ink cb-btn-sm" href="/login">
            Open the live demo
          </a>
        </div>
      </header>

      <main id="main">
        <section className="cb-hero" aria-labelledby="cb-title">
          <div className="cb-col cb-hero-copy">
            <h1 id="cb-title">
              Your agent asks.
              <br />
              Your rules pay.
            </h1>
            <div className="cb-hero-side">
              <p className="cb-lede">Paycurb is a payment firewall between an AI shopping agent and PayPal. Every payment call is allowed, held for you or blocked by rules you wrote, before PayPal sees it.</p>
              <div className="cb-actions">
                <a className="cb-btn cb-btn-green" href="/login">
                  Open the live demo
                </a>
                <a className="cb-btn cb-btn-line" href="#tour">
                  See one payment through
                </a>
              </div>
            </div>
          </div>
          <figure className="cb-col cb-story">
            <HeroWindow />
            <figcaption>
              <ol className="cb-beats">
                {beats.map((beat, index) => (
                  <li key={beat} className={`cb-beat cb-beat-${index}`}>
                    <span className="cb-beat-bar" aria-hidden="true">
                      <span className="cb-beat-fill" />
                    </span>
                    {beat}
                  </li>
                ))}
              </ol>
            </figcaption>
          </figure>
        </section>

        <section id="tour" className="cb-section" aria-labelledby="cb-tour-title">
          <div className="cb-col">
            <div className="cb-head">
              <h2 id="cb-tour-title">One payment, start to finish.</h2>
              <p>The desk lamp from above, slowed down. Scroll and the window follows it through the three places it stops.</p>
            </div>
            <Tour steps={steps} />
          </div>
        </section>

        {facts && (
          <section id="results" className="cb-section cb-results" aria-labelledby="cb-results-title">
            <div className="cb-col">
              <div className="cb-head">
                <h2 id="cb-results-title">
                  {facts.protectedWins} of {facts.total} attacks got money out.
                </h2>
                <p>
                  We ran {facts.total} scripted attacks against the PayPal sandbox, including a real agent reading hostile shop pages. Here is how many moved money, with Paycurb in the way and paying PayPal directly.
                </p>
              </div>
              <div className="cb-score">
                <div className="cb-score-row cb-score-us">
                  <p className="cb-score-label">Through Paycurb</p>
                  <p className="cb-score-num cb-fig">
                    {facts.protectedWins}
                    <span className="cb-of"> of {facts.total}</span>
                  </p>
                  <span className="cb-bar-track" aria-hidden="true">
                    <span className="cb-bar-fill" style={{ "--w": facts.protectedWins / facts.total } as React.CSSProperties} />
                  </span>
                </div>
                <div className="cb-score-row cb-score-them">
                  <p className="cb-score-label">Straight to PayPal</p>
                  <p className="cb-score-num cb-fig">
                    <Tick value={facts.baselineWins} />
                    <span className="cb-sr">{facts.baselineWins}</span>
                    <span className="cb-of"> of {facts.total}</span>
                  </p>
                  <span className="cb-bar-track" aria-hidden="true">
                    <span className="cb-bar-fill" style={{ "--w": facts.baselineWins / facts.total } as React.CSSProperties} />
                  </span>
                </div>
                <dl className="cb-stats">
                  <div>
                    <dt>Moved without Paycurb</dt>
                    <dd className="cb-fig">{facts.lostDirect}</dd>
                  </div>
                  <div>
                    <dt>Moved with Paycurb</dt>
                    <dd className="cb-fig">{facts.lostProtected}</dd>
                  </div>
                  {facts.controls && (
                    <div>
                      <dt>Normal purchases still paid</dt>
                      <dd className="cb-fig">
                        {facts.controls.passed} of {facts.controls.total}
                      </dd>
                    </div>
                  )}
                  {facts.latency && (
                    <div>
                      <dt>Median time the proxy adds</dt>
                      <dd className="cb-fig">{facts.latency} ms</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="cb-groups">
                <div className="cb-report" data-ui>
                  <p className="cb-report-head">
                    <b>Attack report</b>
                    <span>PayPal sandbox, {facts.total} attacks in {facts.groups.length} groups</span>
                  </p>
                  <table>
                    <caption className="cb-sr">Attacks that moved money, by group, paying PayPal directly and through Paycurb</caption>
                    <thead>
                      <tr>
                        <th scope="col">Attack</th>
                        <th scope="col">Straight to PayPal</th>
                        <th scope="col">Through Paycurb</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facts.groups.map((group) => (
                        <tr key={group.id}>
                          <th scope="row">{group.name}</th>
                          <td>
                            <span className="cb-mini cb-mini-red" aria-hidden="true">
                              <i style={{ "--w": group.baseline / group.scenarios } as React.CSSProperties} />
                            </span>
                            <span className="cb-fig">
                              {group.baseline} of {group.scenarios}
                            </span>
                          </td>
                          <td>
                            <span className="cb-mini" aria-hidden="true">
                              <i style={{ "--w": group.protected / group.scenarios } as React.CSSProperties} />
                            </span>
                            <span className="cb-fig cb-ok">
                              {group.protected} of {group.scenarios}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="cb-note">
                  What still gets through by design: an agent tricked into buying the wrong item from a merchant you allow, inside every limit. The rules cannot tell a wrong lamp from a right one. Payments that skip the proxy are out of scope. <a href={threatModel}>Read the threat model</a>.
                </p>
              </div>
            </div>
          </section>
        )}

        <section id="compare" className="cb-section cb-compare" aria-labelledby="cb-compare-title">
          <div className="cb-col">
            <div className="cb-head">
              <h2 id="cb-compare-title">Why not a capped virtual card?</h2>
              <p>A card with a limit is a good backstop, and it works at any checkout. It answers a different question: how much can be charged, not whether this order should be.</p>
            </div>
            <div className="cb-table-wrap">
              <table className="cb-vs">
                <caption className="cb-sr">A spend capped virtual card compared with Paycurb</caption>
                <thead>
                  <tr>
                    <th scope="col">When the agent</th>
                    <th scope="col">Capped virtual card</th>
                    <th scope="col">Paycurb</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">buys a {story.watch.amount} watch from a shop you never named</th>
                    <td data-tone="part"><span className="cb-vs-col">Capped card</span>Declined only if it is over the cap or the card is locked to one merchant</td>
                    <td data-tone="yes"><span className="cb-vs-col">Paycurb</span>Blocked by {story.watch.rule} before PayPal sees it</td>
                  </tr>
                  <tr>
                    <th scope="row">wants a {story.lamp.amount} lamp you might want</th>
                    <td data-tone="no"><span className="cb-vs-col">Capped card</span>Charged or declined, nobody is asked</td>
                    <td data-tone="yes"><span className="cb-vs-col">Paycurb</span>Held. You approve it from your phone</td>
                  </tr>
                  <tr>
                    <th scope="row">changes an approved order to {story.resent.amount}</th>
                    <td data-tone="part"><span className="cb-vs-col">Capped card</span>Charged if it fits under the cap</td>
                    <td data-tone="yes"><span className="cb-vs-col">Paycurb</span>Refused. Your yes is bound to the exact order</td>
                  </tr>
                  <tr>
                    <th scope="row">tries a refund or a payout</th>
                    <td data-tone="no"><span className="cb-vs-col">Capped card</span>Not something a card controls</td>
                    <td data-tone="yes"><span className="cb-vs-col">Paycurb</span>Held or blocked by your rules</td>
                  </tr>
                  <tr>
                    <th scope="row">leaves you asking why</th>
                    <td data-tone="part"><span className="cb-vs-col">Capped card</span>A decline code on a statement</td>
                    <td data-tone="yes"><span className="cb-vs-col">Paycurb</span>The rule, a plain reason and a hash chained log</td>
                  </tr>
                  <tr>
                    <th scope="row">pays at a checkout outside PayPal</th>
                    <td data-tone="yes"><span className="cb-vs-col">Capped card</span>Works anywhere cards are taken</td>
                    <td data-tone="no"><span className="cb-vs-col">Paycurb</span>Only covers payments sent through the proxy</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="connect" className="cb-section cb-connect" aria-labelledby="cb-connect-title">
          <div className="cb-col cb-connect-grid">
            <div className="cb-head">
              <h2 id="cb-connect-title">Point your agent at Paycurb.</h2>
              <p>
                Paycurb serves <code>create_order</code>, <code>get_order</code> and <code>create_refund</code> under the names PayPal&apos;s agent toolkit uses. Swap the server address and the agent keeps working. Your PayPal credentials stay on the proxy.
              </p>
              <p>Every reply says what happened and why, so the agent can tell the user.</p>
            </div>
            <div className="cb-snippets">
              <div className="cb-snippet" data-ui>
                <div className="cb-snippet-head">
                  <span>Agent tool config</span>
                  <CopyButton text={connectConfig} label="Copy the config" />
                </div>
                <pre className="cb-code">
                  <code>{connectConfig}</code>
                </pre>
              </div>
              <div className="cb-snippet" data-ui>
                <div className="cb-snippet-head">
                  <span>What the agent gets back for the lamp</span>
                </div>
                <pre className="cb-code">
                  <code>{JSON.stringify(lampDecision, null, 2)}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section className="cb-section cb-end" aria-labelledby="cb-end-title">
          <div className="cb-col cb-end-in">
            <h2 id="cb-end-title">Try to make it overspend.</h2>
            <p>Sign in with the public demo password, run the agent and watch decisions arrive. It is the PayPal sandbox, so every dollar is play money.</p>
            <div className="cb-actions">
              <a className="cb-btn cb-btn-paper" href="/login">
                Open the live demo
              </a>
              <a className="cb-btn cb-btn-ghost" href={repo}>
                Read the code
              </a>
            </div>
            <ul className="cb-end-marks" aria-label="What the demo shows">
              <li>
                <StopIcon size={15} />
                Blocked before PayPal
              </li>
              <li>
                <ClockIcon size={15} />
                Held for you
              </li>
              <li>
                <CheckIcon size={15} />
                Paid and chained
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="cb-foot">
        <div className="cb-col cb-foot-in">
          <p className="cb-brand">
            <GateMark size={18} />
            Paycurb
          </p>
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
            <li>
              <a href={`${repo}/blob/main/reports/attack-report.md`}>Attack report</a>
            </li>
          </ul>
          <p className="cb-legal">MIT license. PayPal sandbox only, no real money moves. Built for the PayPal AI Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}

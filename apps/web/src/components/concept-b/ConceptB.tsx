import { CopyButton } from "../CopyButton";
import { CheckIcon, ClockIcon, StopIcon } from "../icons";
import { chainRows } from "../landing/chain";
import { dollars } from "../landing/data";
import { demoPolicy } from "../landing/scenarios";
import type { Facts } from "./facts";
import { lampDecision, lampPayload, paypalReference, story } from "./heroData";
import { HeroWindow } from "./HeroWindow";
import { Tour, type TourStep } from "./Tour";
import "./concept-b.css";

import { repo, threatModel } from "../landing/copy";
const askLine = dollars(demoPolicy.auto_approve_below_cents);
const perOrder = dollars(demoPolicy.per_transaction_limit_cents);
const paid = chainRows.find((row) => row.seq === 11);

const connectConfig = `{
  "mcpServers": {
    "paypal": {
      "url": "https://YOUR-PAYCURB-HOST/mcp"
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


export function StoryHero() {
  const beats = [
    `A hostile page sells it a ${story.watch.amount} watch. Blocked before PayPal.`,
    `It wants a ${story.lamp.amount} lamp. Held, since you approve anything over ${askLine}.`,
    `It resends the lamp at ${story.resent.amount}. Blocked by the per order limit.`,
    "You tap Approve on your phone.",
    "PayPal is paid, and the log links the entry to the one before.",
  ];

  return (
    <section id="product" className="cb-hero" aria-labelledby="cb-title">
      <svg className="ca-ambient" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="ca-dot" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ca-dot)" />
      </svg>
      <div className="cb-col cb-hero-copy">
        <h1 id="cb-title">
          <span className="ca-line">
            <span className="ca-line-in">Your agent asks.</span>
          </span>{" "}
          <span className="ca-line ca-line-b">
            <span className="ca-line-in">Your rules pay.</span>
            <svg className="ca-under" viewBox="0 0 400 18" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path pathLength={1} d="M4 12 C 96 5, 230 3, 396 9" />
            </svg>
          </span>
        </h1>
        <div className="cb-hero-side">
          <p className="cb-lede">Paycurb is a payment firewall between an AI shopping agent and PayPal. Every payment call is allowed, held for you or blocked by rules you wrote, before PayPal sees it.</p>
          <div className="cb-actions">
            <a className="cb-btn cb-btn-green" href="/login" data-magnet>
              Get started
            </a>
            <a className="cb-btn cb-btn-line" href="#tour">
              See how it works
            </a>
          </div>
        </div>
      </div>
      <figure className="cb-col cb-story" data-loop>
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
  );
}

export function TourSection({ latency, mark }: { latency: string | null; mark: React.ReactNode }) {
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
      figure: <DecideFigure latency={latency} />,
    },
    {
      id: "pay",
      title: "PayPal pays.",
      body: <p>You tap Approve. Paycurb sends the exact order it held to the PayPal sandbox, records the reference and chains the entry to the one before it.</p>,
      figure: <PayFigure />,
    },
  ];

  return (
    <section id="tour" className="cb-section" aria-labelledby="cb-tour-title">
      <div className="cb-col">
        <div className="cb-head">
          <h2 id="cb-tour-title">
            {mark}
            One payment, start to finish.
          </h2>
          <p>The desk lamp from the top of the page, slowed down. Scroll and the window follows it through the three places it stops.</p>
        </div>
        <Tour steps={steps} />
      </div>
    </section>
  );
}

export function Results({ facts, mark }: { facts: Facts; mark: React.ReactNode }) {
  return (
    <section id="security" className="cb-section cb-results" aria-labelledby="cb-results-title">
      <div className="cb-col">
        <div className="cb-head">
          <h2 id="cb-results-title">
            {mark}
            Where the {facts.total} attacks came from.
          </h2>
          <p>Attacks come in {facts.groups.length} kinds, from hidden instructions on a shop page to a resent approved order. Each bar is how many moved money, paying PayPal directly and through Paycurb.</p>
        </div>
        <div className="cb-groups">
          <div className="cb-report" data-ui>
            <p className="cb-report-head">
              <b>Attack report</b>
              <span>
                PayPal sandbox, {facts.total} attacks in {facts.groups.length} groups
              </span>
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
                {facts.groups.map((group, index) => (
                  <tr key={group.id} style={{ "--i": index } as React.CSSProperties}>
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
  );
}

const vs: { when: string; card: [string, string]; curb: [string, string] }[] = [
  { when: `buys a ${story.watch.amount} watch from a shop you never named`, card: ["part", "Declined only if it is over the cap or outside the card's merchant category limits"], curb: ["yes", `Blocked by ${story.watch.rule} before PayPal sees it`] },
  { when: `wants a ${story.lamp.amount} lamp you might want`, card: ["no", "Charged or declined. No approval is tied to the exact order."], curb: ["yes", "Held. You approve it from your phone"] },
  { when: `changes an approved order to ${story.resent.amount}`, card: ["part", "Charged if it fits under the cap"], curb: ["yes", "Refused. Your yes is bound to the exact order"] },
  { when: "puts the wrong item in the cart", card: ["no", "Sees an amount and a merchant, not the line items or the page the agent read"], curb: ["yes", "Checks every line item and quantity against your rules"] },
  { when: "tries a refund or a payout", card: ["no", "Not something a spending cap controls"], curb: ["yes", "Held or blocked by your rules"] },
  { when: "pays at a checkout outside PayPal", card: ["yes", "Works anywhere cards are taken"], curb: ["no", "Only covers payments sent through the proxy"] },
];

const toneMark = (tone: string) =>
  tone === "yes" ? (
    <svg className="ca-check" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path pathLength={1} d="M3 8.5l3.2 3.2L13 4.5" />
    </svg>
  ) : null;

export function Compare({ mark }: { mark: React.ReactNode }) {
  return (
    <section id="compare" className="cb-section cb-compare" aria-labelledby="cb-compare-title">
      <div className="cb-col">
        <div className="cb-head">
          <h2 id="cb-compare-title">
            {mark}
            Why not a capped virtual card?
          </h2>
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
              {vs.map((row, index) => (
                <tr key={row.when} style={{ "--i": index } as React.CSSProperties}>
                  <th scope="row">{row.when}</th>
                  <td data-tone={row.card[0]}>
                    <span className="cb-vs-col">Capped card</span>
                    {toneMark(row.card[0])}
                    {row.card[1]}
                  </td>
                  <td data-tone={row.curb[0]}>
                    <span className="cb-vs-col">Paycurb</span>
                    {toneMark(row.curb[0])}
                    {row.curb[1]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function ConnectSection({ mark }: { mark: React.ReactNode }) {
  return (
    <section id="connect" className="cb-section cb-connect" aria-labelledby="cb-connect-title">
      <div className="cb-col cb-connect-grid">
        <div className="cb-head">
          <h2 id="cb-connect-title">
            {mark}
            Point your agent at Paycurb.
          </h2>
          <p>
            Paycurb serves <code>create_order</code>, <code>get_order</code> and <code>create_refund</code> under the names PayPal&apos;s agent toolkit uses. Swap the server address and the agent keeps working. Your PayPal credentials stay on the proxy.
          </p>
          <p>
            <a className="ca-sweep ca-strong" href="/connect">
              Full setup, the three answers and the SDK call
            </a>
          </p>
        </div>
        <div className="cb-snippets">
          <div className="cb-snippet" data-ui>
            <div className="cb-snippet-head">
              <span>Agent tool config. YOUR-PAYCURB-HOST is a placeholder for your proxy address.</span>
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
  );
}

export function End() {
  return (
    <section id="start" className="cb-section cb-end" aria-labelledby="cb-end-title">
      <div className="cb-col cb-end-in">
        <div className="cb-end-copy">
          <h2 id="cb-end-title">
            Start with the sandbox workspace.
          </h2>
          <p>Write a policy in plain English, point your agent at it, watch the decisions.</p>
          <ul className="cb-end-marks" aria-label="What every call gets">
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
          <p className="cb-end-runs">Where it runs today: a hosted sandbox workspace, open source under the MIT license, or self hosted with Postgres and a PayPal sandbox app.</p>
        </div>
        <div className="cb-signin" data-ui>
          <h3>Sign in to your workspace</h3>
          <p>Policies, the live feed, approvals and the audit log live in your workspace.</p>
          <a className="cb-btn cb-btn-green" href="/login" data-magnet>
            Get started
          </a>
          <a className="ca-sweep cb-signin-link" href="/login">
            Already have a workspace? Sign in
          </a>
          <a className="ca-sweep cb-signin-link" href={repo}>
            Read the code on GitHub
          </a>
        </div>
      </div>
    </section>
  );
}

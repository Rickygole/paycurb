import type { CSSProperties } from "react";
import { hashPayload, products } from "@paycurb/shared";
import { Logo, LogoGlyph } from "../Logo";
import { chainRows, decisionWords } from "../landing/chain";
import { chain, footer, nav, repo, story, threatModel } from "../landing/copy";
import { dollars, type LandingReport } from "../landing/data";
import { decide, scenarios } from "../landing/scenarios";
import { Roll } from "./Roll";
import { Scenarios } from "./Scenarios";
import { Stage, type SeedRow } from "./Stage";
import "./concept-a.css";

const reportLink = `${repo}/blob/main/reports/attack-report.md`;

const watchPayload = {
  tool: "create_order",
  args: { currencyCode: "USD", payee: "luxury-watches@merchants.example", items: [{ sku: "WATCH-1", name: "Chronos X", quantity: 1, itemCost: 400, itemTotal: 400 }] },
};

const ratio = (part: number, whole: number) => ({ "--r": whole > 0 ? part / whole : 0 }) as CSSProperties;
const local = (href: string) => href.replace(/^\/#/, "#");

export function Mark() {
  return (
    <span className="ca-hmark" aria-hidden="true">
      <LogoGlyph size={20} />
    </span>
  );
}

export function Bar() {
  return (
    <header className="ca-bar">
      <a className="ca-home" href="#top" aria-label="Paycurb, back to the top">
        <Logo size={24} />
      </a>
      <nav aria-label="Page" className="ca-nav">
        {nav.links.map((link) => (
          <a key={link.href} className="ca-sweep" href={local(link.href)}>
            {link.label}
          </a>
        ))}
      </nav>
      <a className="ca-btn ca-btn-ink ca-btn-bar" href="#open" data-magnet>
        Open the live demo
      </a>
    </header>
  );
}

export function Play() {
  const shelf = products.filter((item) => item.merchant_id === "acme-office").map((item) => ({ sku: item.id, name: item.name, price: dollars(item.price_cents) }));
  const seed: SeedRow[] = chainRows.slice(-3).map((row) => ({ seq: row.seq, what: row.what, decision: row.decision, rule: row.rule, entry: row.entry, prev: row.prev }));
  return (
    <section id="try" className="ca-hero" aria-labelledby="try-title">
      <div className="ca-hero-head">
        <h2 id="try-title">
          <Mark />
          Hijack the agent yourself.
        </h2>
        <p className="ca-lede">The store page below hides a $400 order in a review. Send the agent in, then switch Paycurb off and send it again.</p>
      </div>
      <Stage shelf={shelf} seed={seed} />
    </section>
  );
}

export function Days() {
  return (
    <section className="ca-days" aria-labelledby="days-title">
      <div className="ca-days-head">
        <h2 id="days-title">
          <Mark />
          Most calls are not attacks.
        </h2>
        <p>The same rules let the small stuff through, wait for you on the bigger stuff, and refuse an order that changed after you said yes. Each one below runs the real engine in your browser.</p>
      </div>
      <Scenarios />
    </section>
  );
}

export function Numbers({ report }: { report: LandingReport }) {
  const head = report.headline;
  const control = report.groups.find((group) => group.group === "H");
  const latency = report.latency_ms?.proxy_p50;
  const generated = new Date(report.generated_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  return (
    <section id="numbers" className="ca-numbers" aria-labelledby="numbers-title">
      <div className="ca-numbers-pin">
        <div className="ca-numbers-in">
          <h2 id="numbers-title">
            <Mark />
            {head.attack_scenarios} attacks on the PayPal sandbox. {head.protected_success} got paid.
          </h2>
          <dl className="ca-figs">
            <div className="ca-fig ca-fig-lead">
              <dt>Moved money with Paycurb in the way</dt>
              <dd>
                <span className="ca-fig-bar" style={ratio(head.protected_success, head.attack_scenarios)} aria-hidden="true" />
                <Roll text={String(head.protected_success)} scroll /> <span className="ca-of">of {head.attack_scenarios}</span>
              </dd>
            </div>
            <div className="ca-fig ca-fig-bad">
              <dt>Moved money paying PayPal directly</dt>
              <dd>
                <span className="ca-fig-bar" style={ratio(head.baseline_success, head.attack_scenarios)} aria-hidden="true" />
                <Roll text={String(head.baseline_success)} scroll /> <span className="ca-of">of {head.attack_scenarios}</span>
              </dd>
            </div>
            <div className="ca-fig ca-fig-bad">
              <dt>Lost by those {head.baseline_success} attacks</dt>
              <dd>
                <span className="ca-fig-bar" style={ratio(1, 1)} aria-hidden="true" />
                <Roll text={dollars(head.money_lost_baseline_cents)} scroll />
              </dd>
            </div>
            {latency !== undefined && (
              <div className="ca-fig">
                <dt>Median time the proxy adds to a call, not counting PayPal</dt>
                <dd>
                  <span className="ca-fig-bar" style={ratio(1, 1)} aria-hidden="true" />
                  <Roll text={latency.toFixed(2)} scroll /> <span className="ca-of">ms</span>
                </dd>
              </div>
            )}
          </dl>
          <p className="ca-numbers-note">
            {control && <>All {control.protected_success} of {control.scenarios} ordinary purchases in the same run still went through. </>}
            From <a href={reportLink}>the attack report</a>, generated {generated}. What the suite cannot stop is listed in <a href={threatModel}>the threat model</a>.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Watch({ report }: { report: LandingReport | null }) {
  const injected = report?.groups.find((group) => group.group === "A");
  const watch = scenarios.find((item) => item.id === "watch");
  const watchDecision = watch ? decide(watch) : null;
  const watchRow = chainRows.find((row) => row.what === "Chronos X watch");
  if (!watchRow || !watchDecision) return null;
  return (
    <section className="ca-ask-band" aria-labelledby="ask-title">
      <div className="ca-ask-copy">
        <h2 id="ask-title">
          <Mark />
          {story.punch}
        </h2>
        <p className="ca-ask-lead">{story.title}</p>
        <p>{story.body}</p>
      </div>
      <article className="ca-ask" data-ui aria-label={story.cardTitle}>
        <p className="ca-ask-title">{story.cardTitle}</p>
        <div className="ca-ask-item">
          <span className="ca-ask-thumb" aria-hidden="true" />
          <div>
            <b>{watchRow.what}</b>
            <span>
              {watchRow.merchant}, {watch?.action.merchant_id}
            </span>
          </div>
          <span className="num ca-ask-amt">{watchRow.amount}</span>
        </div>
        <div className="ca-ask-verdict">
          <span className={`ca-pill ca-pill-${watchRow.decision}`}>
            {decisionWords[watchRow.decision]} {watchRow.rule}
          </span>
          <strong>{story.verdict}</strong>
        </div>
        <p className="ca-ask-reason">{watchDecision.reason}</p>
        <p className="ca-ask-facts">
          <span>
            {story.entry} <code>{watchRow.entry}</code> {story.follows} <code>{watchRow.prev}</code>
          </span>
          <span>
            Fingerprint <code>{hashPayload(watchPayload).slice(0, 10)}</code>
          </span>
        </p>
        {injected && (
          <p className="ca-ask-facts">
            Hidden instructions on web pages: {injected.baseline_success} of {injected.scenarios} paid direct, {injected.protected_success} of {injected.scenarios} with Paycurb.
          </p>
        )}
        <details className="ca-raw">
          <summary>{story.raw}</summary>
          <div className="ca-raw-grid">
            <div>
              <p>{story.request}</p>
              <pre>
                <code>{JSON.stringify(watchPayload, null, 2)}</code>
              </pre>
            </div>
            <div>
              <p>{story.response}</p>
              <pre>
                <code>{JSON.stringify(watchDecision, null, 2)}</code>
              </pre>
            </div>
          </div>
        </details>
      </article>
    </section>
  );
}

export function Replay() {
  return (
    <section id="chain" className="ca-chain" aria-labelledby="chain-title">
      <div className="ca-compare-head">
        <h2 id="chain-title">
          <Mark />
          {chain.title}
        </h2>
        <p>{chain.body}</p>
      </div>
      <div className="ca-sheet" data-ui>
        <p className="ca-sheet-badge">
          <span>{chain.replay}</span>
          <b>{chain.badge}</b>
        </p>
        <table>
          <caption className="ca-hidden">Replay of audit log entries, each with the fingerprint of the previous entry</caption>
          <thead>
            <tr>
              <th scope="col" className="num">
                {chain.heads[0]}
              </th>
              <th scope="col" className="ca-wide">
                {chain.heads[1]}
              </th>
              <th scope="col">{chain.heads[2]}</th>
              <th scope="col" className="num ca-wide">
                {chain.heads[3]}
              </th>
              <th scope="col">{chain.heads[4]}</th>
              <th scope="col" className="ca-links">
                {chain.heads[5]}
              </th>
            </tr>
          </thead>
          <tbody>
            {chainRows.slice(0, 5).map((row, position) => (
              <tr key={row.seq} style={{ "--i": position } as CSSProperties}>
                <td className="num">{row.seq}</td>
                <td className="num ca-wide">{row.time}</td>
                <td>
                  <span className="ca-sheet-what">{row.what}</span>
                  <span className="ca-sheet-merchant">{row.merchant}</span>
                </td>
                <td className="num ca-wide">{row.amount}</td>
                <td>
                  <span className={`ca-pill ca-pill-${row.decision}`}>
                    {decisionWords[row.decision]} {row.rule}
                  </span>
                </td>
                <td className="ca-links">
                  <span className="ca-link-seg" aria-hidden="true" />
                  <span className="ca-link-node" aria-hidden="true" />
                  <code>{row.entry}</code>
                  <span className="ca-link-prev">
                    follows <code>{row.prev}</code>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="ca-chain-foot">
        <a className="ca-sweep ca-strong" href="/audit">
          {chain.link}
        </a>
      </p>
    </section>
  );
}

export function Foot() {
  return (
    <footer className="ca-foot">
      <div className="ca-foot-top">
        <Logo size={24} />
        <p className="ca-foot-line">Give an AI agent a budget, not a credit card.</p>
        <ul>
          {footer.columns.flat().map((link) => (
            <li key={link.href}>
              <a className="ca-sweep" href={local(link.href)}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <p className="ca-legal">
        <span>
          {footer.line} {footer.license}
        </span>
        <a className="ca-sweep" href="#top">
          Back to top
        </a>
      </p>
    </footer>
  );
}

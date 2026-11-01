import { hashPayload } from "@paycurb/shared";
import { chainRows, decisionWords } from "./chain";
import { card, chain, cta, evidence, hero, stops, story, threatModel } from "./copy";
import { Footer } from "./Footer";
import { GateDiagram } from "./GateDiagram";
import { Header } from "./Header";
import { OpenDemo } from "./OpenDemo";
import { Picker } from "./Picker";
import { Reveal } from "./Reveal";
import { dollars, loadReport } from "./data";
import { decide, scenarios } from "./scenarios";
import "./landing.css";

const watchPayload = {
  tool: "create_order",
  args: { currencyCode: "USD", payee: "luxury-watches@merchants.example", items: [{ sku: "WATCH-1", name: "Chronos X", quantity: 1, itemCost: 400, itemTotal: 400 }] },
};

const reportLink = "https://github.com/Rickygole/paycurb/blob/main/reports/attack-report.md";

export function Landing() {
  const report = loadReport();
  const head = report?.headline;
  const attacks = report?.groups.filter((group) => stops.groups[group.group]) ?? [];
  const control = report?.groups.find((group) => group.group === "H");
  const injected = report?.groups.find((group) => group.group === "A");
  const watch = scenarios.find((item) => item.id === "watch");
  const watchDecision = watch ? decide(watch) : null;
  const watchRow = chainRows.find((row) => row.what === "Chronos X watch");
  const shown = chainRows.slice(0, 5);
  const hash = hashPayload(watchPayload).slice(0, 10);

  return (
    <div className="site" id="top">
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("js")' }} />
      <Header heroActions />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <h1 id="hero-title" className="statement">
              {hero.lines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
            <div className="hero-side">
              <p className="support">{hero.support}</p>
              <p className="dev-line">{hero.developer}</p>
              <div className="actions" id="hero-actions">
                <div className="pair">
                  <a className="btn btn-solid" href="#open">
                    {hero.primary}
                  </a>
                  <a className="btn btn-quiet" href="/connect">
                    {hero.secondary}
                  </a>
                </div>
                <a className="text-link" href={threatModel}>
                  {hero.threatLink}
                </a>
              </div>
            </div>
          </div>
          <GateDiagram />
        </section>

        {head && (
          <section className="evidence" aria-labelledby="evidence-title">
            <h2 id="evidence-title" className="visually-hidden">
              {evidence.label}
            </h2>
            <ul>
              <li>
                <span className="stat num">
                  {head.protected_success} <small>of {head.attack_scenarios}</small>
                </span>
                <span>{evidence.protectedLabel}</span>
              </li>
              <li>
                <span className="stat num">
                  {head.baseline_success} <small>of {head.attack_scenarios}</small>
                </span>
                <span>{evidence.baselineLabel}</span>
              </li>
              {report && (
                <li>
                  <span className="stat num">
                    {report.latency_ms.proxy_p50.toFixed(2)} <small>ms</small>
                  </span>
                  <span>{evidence.latencyLabel}</span>
                </li>
              )}
            </ul>
            <p className="source">
              <a href={reportLink}>{evidence.source}</a>, generated {new Date(report?.generated_at ?? "").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}.
            </p>
          </section>
        )}

        <section id="how" className="band story" aria-labelledby="how-title">
          <div className="story-copy">
            <h2 id="how-title">{story.punch}</h2>
            <p className="lead">{story.title}</p>
            <p>{story.body}</p>
            <ol className="flow">
              {story.steps.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
          {watchRow && watchDecision && (
            <article className="ask" data-ui aria-labelledby="ask-title">
              <p className="ask-title" id="ask-title">
                {story.cardTitle}
              </p>
              <div className="ask-item">
                <div>
                  <b>{watchRow.what}</b>
                  <span>
                    {watchRow.merchant}, {watch?.action.merchant_id}
                  </span>
                </div>
                <span className="num">{watchRow.amount}</span>
              </div>
              <div className="ask-verdict">
                <span className="pill pill-block">
                  {decisionWords[watchRow.decision]} <code>{watchRow.rule}</code>
                </span>
                <strong>{story.verdict}</strong>
              </div>
              <p className="ask-reason">{watchDecision.reason}</p>
              <p className="ask-facts">
                <span>
                  {story.entry} <code>{watchRow.entry}</code> {story.follows} <code>{watchRow.prev}</code>
                </span>
                <span>
                  Fingerprint <code>{hash}</code>
                </span>
              </p>
              {injected && (
                <p className="ask-facts">
                  {stops.groups.A}: {injected.baseline_success} of {injected.scenarios} paid direct, {injected.protected_success} of {injected.scenarios} with Paycurb.
                </p>
              )}
              <details className="raw">
                <summary>{story.raw}</summary>
                <div className="raw-grid">
                  <div className="code-panel" data-ui>
                    <p>{story.request}</p>
                    <pre>
                      <code>{JSON.stringify(watchPayload, null, 2)}</code>
                    </pre>
                  </div>
                  <div className="code-panel" data-ui>
                    <p>{story.response}</p>
                    <pre>
                      <code>{JSON.stringify(watchDecision, null, 2)}</code>
                    </pre>
                  </div>
                </div>
              </details>
            </article>
          )}
        </section>

        <Picker />

        <section className="band compare-band" aria-labelledby="card-title">
          <div className="band-head">
            <h2 id="card-title">{card.title}</h2>
            <p>{card.body}</p>
          </div>
          <div className="compare">
            <table>
              <caption className="visually-hidden">{card.title}</caption>
              <thead>
                <tr>
                  {card.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.rows.map(([topic, cardSide, paycurbSide]) => (
                  <tr key={topic}>
                    <th scope="row">{topic}</th>
                    <td data-label={card.columns[1]}>{cardSide}</td>
                    <td data-label={card.columns[2]}>{paycurbSide}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {head && (
          <section id="stops" className="band stops-grid" aria-labelledby="stops-title">
            <div className="stops-copy">
              <h2 id="stops-title">{stops.title}</h2>
              <p>{stops.body(head.attack_scenarios, head.baseline_success, dollars(head.money_lost_baseline_cents), head.protected_success)}</p>
              {control && <p className="note">{stops.control(control.scenarios)}</p>}
            </div>
            <div className="stops-table">
              <div className="sheet" data-ui>
                <table>
                  <caption className="visually-hidden">Attack groups, how many moved money without and with Paycurb</caption>
                  <thead>
                    <tr>
                      <th scope="col">{stops.heads[0]}</th>
                      <th scope="col" className="num">
                        {stops.heads[1]}
                      </th>
                      <th scope="col" className="num">
                        {stops.heads[2]}
                      </th>
                      <th scope="col" className="num hide-phone">
                        {stops.heads[3]}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {attacks.map((group) => (
                      <tr key={group.group}>
                        <td>{stops.groups[group.group]}</td>
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
                <strong>{stops.limitsLead}</strong> {stops.limits(report?.limitations.map((item) => `${item.description}.`).join(" ") ?? "")} <a href={threatModel}>{stops.limitsLink}</a>
              </p>
            </div>
          </section>
        )}

        <section id="chain" className="band chain" aria-labelledby="chain-title">
          <div className="band-head">
            <h2 id="chain-title">{chain.title}</h2>
            <p>{chain.body}</p>
          </div>
          <Reveal className="chain-table">
            <div className="sheet" data-ui>
              <p className="table-badge">
                <span>{chain.replay}</span>
                <b>{chain.badge}</b>
              </p>
              <table>
                <caption className="visually-hidden">Audit log entries, each with the fingerprint of the previous entry</caption>
                <thead>
                  <tr>
                    <th scope="col" className="num">
                      {chain.heads[0]}
                    </th>
                    <th scope="col" className="hide-small">
                      {chain.heads[1]}
                    </th>
                    <th scope="col">{chain.heads[2]}</th>
                    <th scope="col" className="num hide-phone">
                      {chain.heads[3]}
                    </th>
                    <th scope="col">{chain.heads[4]}</th>
                    <th scope="col" className="hide-phone">
                      {chain.heads[5]}
                    </th>
                    <th scope="col" className="hide-small">
                      {chain.heads[6]}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row, position) => (
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
                          {decisionWords[row.decision]} <code>{row.rule}</code>
                        </span>
                      </td>
                      <td className="hide-phone">
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
          <p className="chain-foot">
            <a className="text-link" href="/audit">
              {chain.link}
            </a>
          </p>
        </section>

        <section id="open" className="band cta" aria-labelledby="cta-title">
          <div className="cta-copy">
            <h2 id="cta-title">{cta.title}</h2>
            <p>{cta.body}</p>
          </div>
          <OpenDemo />
        </section>
      </main>
      <Footer />
    </div>
  );
}

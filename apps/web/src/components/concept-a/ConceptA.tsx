import { products } from "@paycurb/shared";
import { chainRows } from "../landing/chain";
import { dollars, loadReport, type LandingReport } from "../landing/data";
import { OpenDemo } from "../landing/OpenDemo";
import { Count } from "./Count";
import { Scenarios } from "./Scenarios";
import { Stage, type SeedRow } from "./Stage";
import "./concept-a.css";

type Report = LandingReport & { latency_ms?: { proxy_p50: number } };

const repo = "https://github.com/Rickygole/paycurb";
const threatModel = `${repo}/blob/main/docs/threat-model.md`;

const snippet = `{
  "mcpServers": {
    "paypal": {
      "url": "http://localhost:4000/mcp",
      "headers": { "x-agent-id": "office-buyer" }
    }
  }
}`;

const compare = [
  { need: "The agent holds something it can spend with", card: "Yes, a card number it can paste anywhere", curb: "No. It can only ask, and Paycurb holds the PayPal keys" },
  { need: "Checks the merchant before money moves", card: "Some issuers lock a card to one merchant", curb: "Allowlist and blocklist on every call" },
  { need: "Checks what is in the order", card: "Sees an amount and a merchant name", curb: "Items, quantities and totals must add up" },
  { need: "Waits for you on a big order", card: "Approves or declines on the spot", curb: "Holds it until you tap approve" },
  { need: "Stops an approved order being changed", card: "No, any amount under the cap goes", curb: "The approval is bound to the exact payload" },
  { need: "Tells you why it said no", card: "A decline code, later", curb: "A plain sentence and the rule that fired" },
  { need: "A record nobody can quietly edit", card: "A statement after it settles", curb: "Hash chained log, every block included" },
];

export function ConceptA() {
  const report = loadReport() as Report | null;
  const head = report?.headline;
  const control = report?.groups.find((group) => group.group === "H");
  const latency = report?.latency_ms?.proxy_p50;
  const shelf = products.filter((item) => item.merchant_id === "acme-office").map((item) => ({ sku: item.id, name: item.name, price: dollars(item.price_cents) }));
  const seed: SeedRow[] = chainRows.slice(-2).map((row) => ({ seq: row.seq, what: row.what, decision: row.decision, rule: row.rule, entry: row.entry, prev: row.prev }));

  return (
    <div className="ca" id="top">
      <header className="ca-bar">
        <a className="ca-mark" href="#top" aria-label="Paycurb, back to the top">
          paycurb
        </a>
        <nav aria-label="Page" className="ca-nav">
          <a href="#numbers">The numbers</a>
          <a href="#compare">Virtual cards</a>
          <a href="#connect">Connect</a>
        </nav>
        <a className="ca-btn ca-btn-ink ca-btn-bar" href="#connect">
          Open the live demo
        </a>
      </header>

      <main>
        <section className="ca-hero" aria-labelledby="hero-title">
          <div className="ca-hero-head">
            <h1 id="hero-title">
              <span className="ca-rise">Hijack the agent.</span> <span className="ca-rise ca-rise-b">Keep the money.</span>
            </h1>
            <p className="ca-lede">Paycurb is a payment firewall between an AI shopping agent and PayPal. The store page below has a $400 order hidden in a review. Send the agent in and see what reaches PayPal.</p>
          </div>
          <Stage shelf={shelf} seed={seed} />
        </section>

        <section className="ca-days" aria-labelledby="days-title">
          <div className="ca-days-head">
            <h2 id="days-title">Most calls are not attacks.</h2>
            <p>The same rules let the small stuff through, wait for you on the bigger stuff, and refuse an order that changed after you said yes. Each one below runs the real engine in your browser.</p>
          </div>
          <Scenarios />
        </section>

        {head && (
          <section id="numbers" className="ca-numbers" aria-labelledby="numbers-title">
            <div className="ca-numbers-in">
              <h2 id="numbers-title">
                {head.attack_scenarios} attacks on the PayPal sandbox. {head.protected_success} got paid.
              </h2>
              <dl className="ca-figs">
                <div className="ca-fig ca-fig-lead">
                  <dt>Moved money with Paycurb in the way</dt>
                  <dd>
                    <Count value={head.protected_success} /> <span className="ca-of">of {head.attack_scenarios}</span>
                  </dd>
                </div>
                <div className="ca-fig ca-fig-bad">
                  <dt>Moved money paying PayPal directly</dt>
                  <dd>
                    <Count value={head.baseline_success} /> <span className="ca-of">of {head.attack_scenarios}</span>
                  </dd>
                </div>
                <div className="ca-fig ca-fig-bad">
                  <dt>Lost by those {head.baseline_success} attacks</dt>
                  <dd>
                    <Count value={head.money_lost_baseline_cents / 100} decimals={2} prefix="$" />
                  </dd>
                </div>
                {latency !== undefined && (
                  <div className="ca-fig">
                    <dt>Median time the proxy adds to a call</dt>
                    <dd>
                      <Count value={latency} decimals={2} /> <span className="ca-of">ms</span>
                    </dd>
                  </div>
                )}
              </dl>
              <p className="ca-numbers-note">
                {control && (
                  <>
                    All {control.protected_success} of {control.scenarios} ordinary purchases in the same run still went through.{" "}
                  </>
                )}
                Numbers come straight from <a href={`${repo}/blob/main/reports/attack-report.md`}>the attack report</a>, regenerated with one command. What the suite cannot stop is listed in <a href={threatModel}>the threat model</a>.
              </p>
            </div>
          </section>
        )}

        <section className="ca-how" aria-labelledby="how-title">
          <h2 id="how-title">Three hops, one place to say no.</h2>
          <ol className="ca-hops">
            <li className="ca-hop">
              <h3>The agent asks.</h3>
              <p>It calls create_order with a payee, items and a total. It never sees a PayPal credential.</p>
              <code>create_order(payee, items)</code>
            </li>
            <li className="ca-hop ca-hop-gate">
              <h3>Paycurb decides.</h3>
              <p>Sixteen fixed rules run in order. No model is asked. The first rule that objects wins and says why.</p>
              <code>evaluate(action, policy, state)</code>
            </li>
            <li className="ca-hop">
              <h3>PayPal pays, only if allowed.</h3>
              <p>Allowed calls go to PayPal Orders v2. Held calls wait for you. Blocked calls never leave.</p>
              <code>0F4626979R705464G</code>
            </li>
          </ol>
        </section>

        <section id="compare" className="ca-compare" aria-labelledby="compare-title">
          <div className="ca-compare-head">
            <h2 id="compare-title">Why not a virtual card?</h2>
            <p>A capped card limits the damage to the cap. It cannot tell a desk lamp from a watch, and the agent still holds the card number.</p>
          </div>
          <div className="ca-table">
            <table>
              <caption className="ca-hidden">What a virtual card checks compared with Paycurb</caption>
              <thead>
                <tr>
                  <th scope="col">What you need</th>
                  <th scope="col">Virtual card</th>
                  <th scope="col">Paycurb</th>
                </tr>
              </thead>
              <tbody>
                {compare.map((row) => (
                  <tr key={row.need}>
                    <th scope="row">{row.need}</th>
                    <td data-label="Virtual card">{row.card}</td>
                    <td className="ca-curb" data-label="Paycurb">{row.curb}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="connect" className="ca-connect" aria-labelledby="connect-title">
          <div className="ca-connect-copy">
            <h2 id="connect-title">Swap one URL.</h2>
            <p>Paycurb speaks MCP with the same tool names as the PayPal agent toolkit: create_order, get_order and create_refund. Point your agent at the proxy instead of PayPal and it works unchanged.</p>
            <pre className="ca-code">
              <code>{snippet}</code>
            </pre>
          </div>
          <div className="ca-connect-demo">
            <OpenDemo />
          </div>
        </section>
      </main>

      <footer className="ca-foot">
        <div className="ca-foot-top">
          <p className="ca-mark">paycurb</p>
          <p className="ca-foot-line">Give an AI agent a budget, not a credit card.</p>
          <ul>
            <li>
              <a href={repo}>GitHub repository</a>
            </li>
            <li>
              <a href={threatModel}>Threat model</a>
            </li>
            <li>
              <a href={`${repo}/blob/main/reports/attack-report.md`}>Attack report</a>
            </li>
            <li>
              <a href={`${repo}/blob/main/docs/architecture.md`}>Architecture</a>
            </li>
            <li>
              <a href="/login">Sign in</a>
            </li>
          </ul>
        </div>
        <p className="ca-legal">
          <span>MIT license. PayPal sandbox only, no real money moves.</span>
          <a href="#top">Back to top</a>
        </p>
      </footer>
    </div>
  );
}

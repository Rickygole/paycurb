import { Footer } from "../landing/Footer";
import { Header } from "../landing/Header";
import { decide, scenarios } from "../landing/scenarios";
import "../landing/landing.css";
import { Reveal } from "../landing/Reveal";
import { CodeBlock } from "./CodeBlock";
import { connect } from "./copy";
import "./connect.css";

const mcpRateLimit = 120;

const lampArgs = {
  currencyCode: "USD",
  payee: "acme-office@merchants.example",
  items: [{ sku: "LAMP-1", name: "Desk lamp", quantity: 1, itemCost: 75, itemTotal: 75 }],
};

const json = (value: unknown) => JSON.stringify(value, null, 2);

function engineResult(id: string) {
  const scenario = scenarios.find((item) => item.id === id);
  return scenario ? decide(scenario) : null;
}

export function Connect() {
  const base = (process.env.PROXY_URL || "http://localhost:4000").replace(/\/$/, "");
  const endpoint = `${base}/mcp`;
  const held = engineResult("lamp");
  const blocked = engineResult("watch");

  const config = json({ mcpServers: { paycurb: { type: "http", url: endpoint, headers: { "x-agent-id": "office-agent" } } } });
  const sdk = [
    'import { Client } from "@modelcontextprotocol/sdk/client/index.js";',
    'import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";',
    "",
    'const client = new Client({ name: "office-agent", version: "1.0.0" });',
    `const transport = new StreamableHTTPClientTransport(new URL("${endpoint}"), {`,
    '  requestInit: { headers: { "x-agent-id": "office-agent" } },',
    "});",
    "await client.connect(transport);",
  ].join("\n");
  const call = [
    "const result = await client.callTool({",
    '  name: "create_order",',
    `  arguments: ${json(lampArgs).replace(/\n/g, "\n  ")},`,
    "});",
    "const answer = JSON.parse(result.content[0].text);",
  ].join("\n");
  const answers = {
    allow: { decision: "allow", rule_id: "R99", reason: "Executed at PayPal: COMPLETED", order: { id: "ORDER_ID", status: "COMPLETED", capture_id: "CAPTURE_ID" } },
    escalate: held ? { ...held, approval_id: "APPROVAL_ID" } : null,
    block: blocked,
  };

  return (
    <div className="site">
      <script dangerouslySetInnerHTML={{ __html: 'document.documentElement.classList.add("js")' }} />
      <Header />
      <main>
        <section className="band connect-hero" aria-labelledby="connect-title">
          <div className="connect-intro">
            <h1 id="connect-title" className="statement">
              {connect.title}
            </h1>
            <p className="support">{connect.intro}</p>
          </div>
          <div className="endpoint">
            <CodeBlock label={connect.endpointLabel} code={endpoint} />
            <p className="hint">{connect.endpointNote}</p>
            <aside className="sandbox" aria-labelledby="sandbox-title">
              <h2 id="sandbox-title">{connect.sandboxTitle}</h2>
              <p>{connect.sandbox(mcpRateLimit)}</p>
            </aside>
          </div>
        </section>

        <section className="band quick" aria-labelledby="quick-title">
          <h2 id="quick-title">{connect.quickTitle}</h2>
          <Reveal as="ol" className="quick-steps">
            {connect.quick.map((step, position) => (
              <li key={step.title} style={{ "--i": position } as React.CSSProperties}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <a className="text-link" href={step.href}>
                  {step.link}
                </a>
              </li>
            ))}
          </Reveal>
        </section>

        <section id="config" className="band connect-row" aria-labelledby="config-title">
          <div className="connect-text">
            <h2 id="config-title">{connect.configTitle}</h2>
            <p>{connect.configText}</p>
          </div>
          <Reveal className="connect-code">
            <CodeBlock label={connect.configJson} code={config} />
            <CodeBlock label={connect.configSdk} code={sdk} />
          </Reveal>
        </section>

        <section className="band connect-row" aria-labelledby="call-title">
          <div className="connect-text">
            <h2 id="call-title">{connect.callTitle}</h2>
            <p>{connect.callText}</p>
          </div>
          <Reveal className="connect-code">
            <CodeBlock label={connect.callLabel} code={call} />
          </Reveal>
        </section>

        <section className="band answers-band" aria-labelledby="answers-title">
          <div className="band-head">
            <h2 id="answers-title">{connect.answersTitle}</h2>
            <p>{connect.answersText}</p>
          </div>
          <Reveal className="answers">
            {connect.answers.map((answer, position) => {
              const body = answers[answer.id as keyof typeof answers];
              return (
                <article key={answer.id} className={`answer answer-${answer.id}`} data-ui style={{ "--i": position } as React.CSSProperties} aria-labelledby={`answer-${answer.id}`}>
                  <h3 id={`answer-${answer.id}`}>
                    <span className={`pill pill-${answer.id}`}>{answer.title}</span>
                  </h3>
                  <p>{answer.text}</p>
                  {body && <CodeBlock label={`${answer.title} response`} code={json(body)} />}
                </article>
              );
            })}
          </Reveal>
          <p className="hint answers-note">{connect.idsNote}</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}

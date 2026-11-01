import { hero } from "./copy";
import { decide, scenarios } from "./scenarios";

const tokens = [
  { id: "pens", amount: "$12", motion: "pass" },
  { id: "lamp", amount: "$75", motion: "hold" },
  { id: "watch", amount: "$400", motion: "stop" },
];

const words = { allow: "Allowed", escalate: "Held", block: "Blocked" } as const;

function Token({ amount, motion, x, y, wide = false }: { amount: string; motion: string; x: number; y: number; wide?: boolean }) {
  const width = wide ? 96 : 80;
  const height = wide ? 44 : 36;
  return (
    <g className={`gd-token gd-${motion}`}>
      <rect x={x} y={y} width={width} height={height} rx="10" />
      <text x={x + width / 2} y={y + height / 2 + (wide ? 8 : 6)} textAnchor="middle">
        {amount}
      </text>
    </g>
  );
}

function Wide() {
  return (
    <svg className="gd gd-wide" viewBox="0 0 1100 220" role="img" aria-label={hero.diagramLabel}>
      <line className="gd-lane" x1="150" y1="110" x2="950" y2="110" />
      <rect className="gd-agent" x="40" y="66" width="92" height="88" rx="24" />
      <circle className="gd-eye" cx="72" cy="104" r="7" />
      <circle className="gd-eye" cx="100" cy="104" r="7" />
      <rect className="gd-eye" x="70" y="124" width="32" height="6" rx="3" />
      <rect className="gd-arm" x="548" y="82" width="16" height="56" rx="4" />
      <rect className="gd-post" x="540" y="20" width="32" height="64" rx="8" />
      <path className="gd-post" d="M540 144a8 8 0 0 1 8-8h16a8 8 0 0 1 8 8v44a8 8 0 0 1-8 8h-76a8 8 0 0 1-8-8v-12a8 8 0 0 1 8-8h52z" />
      <rect className="gd-paypal" x="968" y="66" width="92" height="88" rx="20" />
      <text className="gd-p" x="1014" y="126" textAnchor="middle">
        P
      </text>
      {tokens.map((token) => (
        <Token key={token.id} amount={token.amount} motion={token.motion} x={150} y={88} wide />
      ))}
    </svg>
  );
}

function Tall() {
  return (
    <svg className="gd gd-tall" viewBox="0 0 320 440" role="img" aria-label={hero.diagramLabel}>
      <line className="gd-lane" x1="160" y1="100" x2="160" y2="350" />
      <rect className="gd-agent" x="118" y="12" width="84" height="80" rx="22" />
      <circle className="gd-eye" cx="147" cy="46" r="6" />
      <circle className="gd-eye" cx="173" cy="46" r="6" />
      <rect className="gd-eye" x="145" y="64" width="30" height="6" rx="3" />
      <text className="gd-label" x="216" y="46">
        {hero.agent}
      </text>
      <text className="gd-note" x="216" y="66">
        No PayPal keys
      </text>
      <rect className="gd-arm" x="116" y="202" width="88" height="14" rx="4" />
      <rect className="gd-post" x="24" y="196" width="96" height="26" rx="8" />
      <path className="gd-post" d="M200 204a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v52a8 8 0 0 1-8 8h-12a8 8 0 0 1-8-8v-34h-60a8 8 0 0 1-8-8z" />
      <text className="gd-label" x="24" y="244">
        {hero.gate}
      </text>
      <rect className="gd-paypal" x="118" y="352" width="84" height="80" rx="20" />
      <text className="gd-p" x="160" y="407" textAnchor="middle">
        P
      </text>
      <text className="gd-label" x="216" y="388">
        {hero.paypal}
      </text>
      <text className="gd-note" x="216" y="408">
        Sandbox
      </text>
      {tokens.map((token) => (
        <Token key={token.id} amount={token.amount} motion={token.motion} x={120} y={104} />
      ))}
    </svg>
  );
}

export function GateDiagram() {
  const legend = tokens.map((token) => {
    const scenario = scenarios.find((item) => item.id === token.id);
    const result = scenario ? decide(scenario) : null;
    return { ...token, label: scenario?.label ?? token.id, result };
  });

  return (
    <figure className="diagram" data-ui>
      <Wide />
      <Tall />
      <div className="diagram-captions" aria-hidden="true">
        <p>
          <b>{hero.agent}</b> {hero.agentNote}
        </p>
        <p>
          <b>{hero.gate}</b> {hero.gateNote}
        </p>
        <p>
          <b>{hero.paypal}</b> {hero.paypalNote}
        </p>
      </div>
      <figcaption className="diagram-legend">
        {legend.map((item) =>
          item.result ? (
            <span key={item.id} className={`legend legend-${item.result.decision}`}>
              <i aria-hidden="true" />
              {item.amount} {item.label.toLowerCase()}: {words[item.result.decision]} <code>{item.result.rule_id}</code>
            </span>
          ) : null,
        )}
      </figcaption>
    </figure>
  );
}

"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { decide, demoPolicy, scenarios } from "./scenarios";

const verdicts = { allow: "Allowed.", escalate: "Held for you.", block: "Blocked." } as const;
const words = { allow: "allowed", escalate: "held", block: "blocked" } as const;

export function Picker() {
  const [index, setIndex] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const scenario = scenarios[index];
  const result = decide(scenario);

  function move(event: KeyboardEvent, step: number) {
    event.preventDefault();
    const next = (index + step + scenarios.length) % scenarios.length;
    setIndex(next);
    refs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowRight") move(event, 1);
    if (event.key === "ArrowUp" || event.key === "ArrowLeft") move(event, -1);
  }

  return (
    <section id="try" className={`band try is-${result.decision}`} aria-labelledby="try-title">
      <div className="try-head">
        <h2 id="try-title">
          This purchase is{" "}
          <span key={result.decision} className="swap">
            {words[result.decision]}
          </span>
          .
        </h2>
        <p>Pick what the agent tries to buy. The same policy engine the proxy runs decides it, right here in your browser.</p>
      </div>
      <div className="picker" data-ui>
        <div role="radiogroup" aria-label="What the agent tries to buy" className="options" onKeyDown={onKeyDown}>
          {scenarios.map((item, position) => (
            <button
              key={item.id}
              ref={(node) => {
                refs.current[position] = node;
              }}
              type="button"
              role="radio"
              aria-checked={position === index}
              tabIndex={position === index ? 0 : -1}
              className="option"
              onClick={() => setIndex(position)}
            >
              <span className="option-label">{item.label}</span>
              <span className="option-detail">{item.detail}</span>
            </button>
          ))}
        </div>
        <div className="verdict" aria-live="polite">
          <strong key={`${scenario.id}-${result.decision}`}>{verdicts[result.decision]}</strong>
          <p>{result.reason}</p>
          <span className="rule">Rule {result.rule_id}, policy version {demoPolicy.version}</span>
        </div>
      </div>
    </section>
  );
}

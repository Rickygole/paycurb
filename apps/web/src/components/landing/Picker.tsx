"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { CheckIcon, ClockIcon, XIcon } from "../icons";
import { picker } from "./copy";
import { decide, demoPolicy, scenarios } from "./scenarios";

const icons = { allow: CheckIcon, escalate: ClockIcon, block: XIcon };

export function Picker() {
  const [index, setIndex] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const scenario = scenarios[index];
  const result = decide(scenario);
  const Icon = icons[result.decision];

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
          This purchase is <span className="word">{picker.words[result.decision]}</span>.
        </h2>
        <p>{picker.body}</p>
      </div>
      <div className="picker" data-ui>
        <div role="radiogroup" aria-label={picker.group} className="options" onKeyDown={onKeyDown}>
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
          <span className={`pill pill-${result.decision}`}>{picker.verdicts[result.decision]}</span>
          <p className="verdict-line">
            <Icon size={20} strokeWidth={2.5} />
            {result.reason}
          </p>
          <span className="rule">
            Rule <code>{result.rule_id}</code>, policy version {demoPolicy.version}
          </span>
        </div>
      </div>
    </section>
  );
}

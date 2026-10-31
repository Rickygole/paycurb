"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { chainRows, decisionWords } from "./chain";

const visible = 4;
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribe = (change: () => void) => {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};
const outcome = { allow: "Forwarded to PayPal", escalate: "Held for the owner", block: "Stopped before PayPal" } as const;

export function Gate() {
  const [head, setHead] = useState(visible - 1);
  const [choice, setChoice] = useState<boolean | null>(null);
  const reduced = useSyncExternalStore(subscribe, () => window.matchMedia(motionQuery).matches, () => true);
  const playing = choice ?? !reduced;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setHead((value) => (value + 1) % chainRows.length), 3200);
    return () => window.clearInterval(timer);
  }, [playing]);

  const current = chainRows[head];
  const rows = Array.from({ length: visible }, (_, back) => chainRows[(head - back + chainRows.length) % chainRows.length]);

  return (
    <div className="gate" data-ui data-decision={current.decision}>
      <div className="gate-head">
        <p className="gate-title">Gate, live decisions</p>
        <button type="button" className="gate-toggle" onClick={() => setChoice(!playing)}>
          {playing ? "Pause" : "Play"}
        </button>
      </div>
      <div className="gate-path" aria-hidden="true">
        <div className="node">
          <b>Agent</b>
          <span>Untrusted, holds no PayPal keys</span>
        </div>
        <div className="node node-gate">
          <b>Paycurb</b>
          <span key={head} className="node-verdict">
            {decisionWords[current.decision]} by {current.rule}
          </span>
        </div>
        <div className="node node-paypal">
          <b>PayPal</b>
          <span>Sandbox, executes only if allowed</span>
        </div>
        <span key={head} className="lane">
          <i className="dot" />
        </span>
      </div>
      <p className="gate-outcome" key={`o${head}`}>
        {current.what}: {outcome[current.decision]}
      </p>
      <ol className="stream" aria-label="Most recent decisions, newest first">
        {rows.map((row, position) => (
          <li key={row.seq} className={`stream-row is-${row.decision}${position === 0 ? " is-new" : ""}`}>
            <span className="num stream-seq">{row.seq}</span>
            <span className="stream-what">
              <b>{row.what}</b>
              <span>{row.reason}</span>
            </span>
            <span className="num stream-amt">{row.amount}</span>
            <span className={`pill pill-${row.decision}`}>
              {decisionWords[row.decision]} {row.rule}
            </span>
            <span className="stream-hash">
              <code>{row.entry}</code>
              <span>follows {row.prev}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

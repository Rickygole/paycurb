"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { reducedMotion } from "@/lib/motion";
import { decide, scenarios, type Scenario } from "../landing/scenarios";
import { dollars, plain, rules, stopAt, wait } from "./rules";

type Outcome = "allow" | "escalate" | "block";
interface Result {
  decision: Outcome;
  rule: string;
  reason: string;
}

const cards = [
  { id: "pens", title: "Pen refills", ask: "The agent buys what you asked for.", after: { allow: "Paid. Nobody had to look." } },
  { id: "lamp", title: "Desk lamp", ask: "A bigger order, from a store you trust.", after: { escalate: "Waiting for you.", allow: "Paid, because you said yes." } },
  { id: "tampered", title: "The lamp, resent bigger", ask: "You approved $75.00. The agent now sends $450.00.", after: { block: "Refused. Your yes was for a different order." } },
];

const words: Record<Outcome, string> = { allow: "Allowed", escalate: "Held for you", block: "Blocked" };

function Card({ card, scenario, delay }: { card: (typeof cards)[number]; scenario: Scenario; delay: number }) {
  const [check, setCheck] = useState(-1);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const run = useRef(0);

  const send = useCallback(async (approved = false) => {
    const id = ++run.current;
    const quick = reducedMotion();
    const target = approved ? { ...scenario, approval: { payload_hash: scenario.action.payload_hash, amount_cents: scenario.action.amount_cents } } : scenario;
    const decision = decide(target);
    const stop = Math.min(stopAt(decision.rule_id), rules.length - 1);
    setBusy(true);
    setResult(null);
    for (let index = 0; index <= stop; index++) {
      if (id !== run.current) return;
      setCheck(index);
      await wait(quick ? 0 : 55);
    }
    if (id !== run.current) return;
    setResult({ decision: decision.decision, rule: decision.rule_id, reason: plain(decision.reason) });
    setBusy(false);
  }, [scenario]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (!("IntersectionObserver" in window)) {
      timer = setTimeout(() => send(), 0);
      return () => clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        timer = setTimeout(() => send(), reducedMotion() ? 0 : delay);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    const current = run;
    return () => {
      observer.disconnect();
      clearTimeout(timer);
      current.current++;
    };
  }, [send, delay]);

  const state = result?.decision ?? "idle";
  const after = result ? (card.after as Partial<Record<Outcome, string>>)[result.decision] : undefined;
  const approvedOnce = result?.decision === "allow" && card.id === "lamp";

  return (
    <article ref={ref} className={`ca-day is-${state}`} data-ui aria-labelledby={`day-${card.id}`}>
      <div className="ca-day-top">
        <h3 id={`day-${card.id}`}>{card.title}</h3>
        <span className="ca-day-amt num">{dollars(scenario.action.amount_cents)}</span>
      </div>
      <p className="ca-day-ask">{card.ask}</p>
      <p className="ca-day-where">
        at {scenario.action.merchant_id}, sku {scenario.action.line_items[0]?.sku}
      </p>
      <div className="ca-cells" aria-hidden="true">
        {rules.map((rule, index) => (
          <span key={rule.id} className={check < 0 || index > check ? "" : index === check && result && result.decision !== "allow" ? `is-${result.decision}` : "is-pass"} title={`${rule.id} ${rule.name}`} />
        ))}
      </div>
      <div className="ca-day-out" aria-live="polite">
        {result ? (
          <>
            <p className="ca-day-verdict">
              <span className={`ca-pill ca-pill-${result.decision}`}>
                {words[result.decision]} {result.rule}
              </span>
              <span className="ca-day-after">{after}</span>
            </p>
            <p className="ca-day-reason">{result.reason}.</p>
          </>
        ) : (
          <p className="ca-day-reason">{busy ? "Checking sixteen rules in order." : "Ready to send."}</p>
        )}
      </div>
      <div className="ca-day-act">
        {result?.decision === "escalate" ? (
          <button type="button" className="ca-btn ca-btn-approve" onClick={() => send(true)}>
            Approve {dollars(scenario.action.amount_cents)}
          </button>
        ) : (
          <button type="button" className="ca-btn ca-btn-line" onClick={() => send(false)} disabled={busy}>
            {approvedOnce ? "Start over" : "Send it again"}
          </button>
        )}
      </div>
    </article>
  );
}

export function Scenarios() {
  return (
    <div className="ca-days-row">
      {cards.map((card, index) => {
        const scenario = scenarios.find((item) => item.id === card.id);
        return scenario ? <Card key={card.id} card={card} scenario={scenario} delay={index * 380} /> : null;
      })}
    </div>
  );
}

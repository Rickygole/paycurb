"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { count, plainReason } from "@/lib/format";
import { askForStats, reducedMotion } from "@/lib/motion";
import type { StreamStatus } from "@/lib/stream";
import type { Feed, Outcome } from "@/lib/types";
import { GateMark } from "../icons";

const TRAVEL = 450;
const toneColour: Record<Outcome, string> = { allow: "var(--allow-ink)", block: "var(--block-ink)", escalate: "var(--held-ink)" };
const toneFill: Record<Outcome, string> = { allow: "var(--allow-bg)", block: "var(--block-bg)", escalate: "var(--held-bg)" };
const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

interface Caption {
  key: string;
  text: string;
  tone: "block" | "held";
}

function flash(ring: HTMLElement | null, decision: Outcome, duration: number) {
  if (!ring) return;
  ring.style.borderColor = toneColour[decision];
  ring.animate(
    [
      { opacity: 0.95, transform: "scale(1)" },
      { opacity: 0, transform: "scale(1.7)" },
    ],
    { duration, easing: "ease-out" },
  );
}

function Flight({ item, delay, policyRing, paypalRing, onCaption, onDone }: {
  item: Feed;
  delay: number;
  policyRing: React.RefObject<HTMLSpanElement | null>;
  paypalRing: React.RefObject<HTMLSpanElement | null>;
  onCaption: (caption: Caption) => void;
  onDone: (id: string) => void;
}) {
  const lane = useRef<HTMLSpanElement>(null);
  const puck = useRef<HTMLSpanElement>(null);
  const tone = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const laneEl = lane.current;
    const puckEl = puck.current;
    const toneEl = tone.current;
    if (!laneEl || !puckEl || !toneEl) return;
    const timers: number[] = [];
    const later = (ms: number, run: () => void) => timers.push(window.setTimeout(run, ms));
    const decision = item.decision;
    toneEl.style.background = toneFill[decision];
    toneEl.style.color = toneColour[decision];
    const options = { fill: "forwards" as const, easing: ease };

    laneEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay, fill: "backwards" });
    laneEl.animate([{ transform: "translateX(0%)" }, { transform: "translateX(50%)" }], { ...options, duration: TRAVEL, delay });

    const atPolicy = delay + TRAVEL;
    later(atPolicy, () => {
      toneEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: "forwards" });
      if (decision === "allow") {
        flash(policyRing.current, "allow", 400);
        laneEl.animate([{ transform: "translateX(50%)" }, { transform: "translateX(100%)" }], { ...options, duration: TRAVEL, delay: 80 });
        later(80 + TRAVEL, () => {
          flash(paypalRing.current, "allow", 500);
          puckEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 200, fill: "forwards" }).finished.then(() => onDone(item.id), () => onDone(item.id));
        });
        return;
      }
      if (decision === "block") {
        flash(policyRing.current, "block", 400);
        onCaption({ key: item.id, text: plainReason(item), tone: "block" });
        puckEl
          .animate(
            [
              { transform: "translateY(0)", opacity: 1 },
              { transform: "translateY(14px)", opacity: 0 },
            ],
            { duration: 420, delay: 260, easing: "cubic-bezier(0.55, 0.055, 0.675, 0.19)", fill: "forwards" },
          )
          .finished.then(() => onDone(item.id), () => onDone(item.id));
        return;
      }
      flash(policyRing.current, "escalate", 400);
      onCaption({ key: item.id, text: "Held for you to approve", tone: "held" });
      askForStats();
      puckEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: 2200, fill: "forwards" }).finished.then(() => onDone(item.id), () => onDone(item.id));
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      laneEl.getAnimations().forEach((animation) => animation.cancel());
      puckEl.getAnimations().forEach((animation) => animation.cancel());
      toneEl.getAnimations().forEach((animation) => animation.cancel());
    };
  }, [item, delay, policyRing, paypalRing, onCaption, onDone]);

  return (
    <span ref={lane} className="lane" aria-hidden="true">
      <span ref={puck} className="puck">
        <span className="base" />
        <span ref={tone} className="tone" />
      </span>
    </span>
  );
}

function Resting({ item }: { item: Feed }) {
  const at = item.decision === "allow" ? "100%" : "50%";
  return (
    <span className="lane" aria-hidden="true" style={{ transform: `translateX(${at})` }}>
      <span className="puck">
        <span className="tone" style={{ opacity: 1, background: toneFill[item.decision], color: toneColour[item.decision] }} />
      </span>
    </span>
  );
}

export function Gate({ items, status, policyVersion }: { items: Feed[] | null; status: StreamStatus; policyVersion: number | null }) {
  const seen = useRef<Set<string> | null>(null);
  const [flights, setFlights] = useState<{ item: Feed; delay: number }[]>([]);
  const [resting, setResting] = useState<Feed | null>(null);
  const [caption, setCaption] = useState<Caption | null>(null);
  const policyRing = useRef<HTMLSpanElement>(null);
  const paypalRing = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!items) return;
    if (!seen.current) {
      seen.current = new Set(items.map((item) => item.id));
      return;
    }
    const known = seen.current;
    const added = items.filter((item) => !known.has(item.id));
    if (added.length === 0) return;
    added.forEach((item) => known.add(item.id));
    const ordered = [...added].sort((a, b) => a.ts.localeCompare(b.ts)).slice(-3);
    if (reducedMotion()) {
      const last = ordered[ordered.length - 1];
      setResting(last);
      if (last.decision === "block") setCaption({ key: last.id, text: plainReason(last), tone: "block" });
      if (last.decision === "escalate") {
        setCaption({ key: last.id, text: "Held for you to approve", tone: "held" });
        askForStats();
      }
      return;
    }
    setFlights((current) => [...current, ...ordered.map((item, index) => ({ item, delay: index * 380 }))].slice(-6));
  }, [items]);

  useEffect(() => {
    if (!caption) return;
    const timer = setTimeout(() => setCaption((current) => (current?.key === caption.key ? null : current)), 3000);
    return () => clearTimeout(timer);
  }, [caption]);

  const showCaption = useCallback((next: Caption) => setCaption(next), []);
  const land = useCallback((id: string) => setFlights((current) => current.filter((flight) => flight.item.id !== id)), []);

  const tally = { block: 0, escalate: 0, allow: 0 };
  for (const item of items ?? []) if (item.decision in tally) tally[item.decision] += 1;
  const total = items?.length ?? 0;
  const live = status === "live";

  return (
    <>
      <header className="feed-title">
        <h1 id="feed-title" className="title">
          Live feed
        </h1>
        <p role="status">
          <span className="live-dot" data-state={live ? "live" : "polling"} aria-hidden="true" />
          {live ? "Live from the policy engine" : status === "connecting" ? "Connecting, checking every 2 seconds" : "Stream down, checking every 2 seconds"}
        </p>
      </header>
      <section className="panel gate" aria-labelledby="feed-title">
        <div className="gate-track" role="img" aria-label={`Every payment call goes from your agent through the Paycurb policy before PayPal. Of the last ${total} calls, ${tally.block} were stopped, ${tally.escalate} held for you and ${tally.allow} passed.`}>
          <span className="gate-line" />
          <span className="gate-node" style={{ left: "0%" }}>
            <span className="node-dot" />
            <span className="node-label">
              <b>Agent</b>
              <span className="end-sub">Your shopping agent</span>
            </span>
          </span>
          <span className="gate-node" style={{ left: "50%" }}>
            <span className="node-policy">
              <GateMark size={20} posts />
              <span ref={policyRing} className="node-ring" />
            </span>
            <span className="node-label">
              <b>Paycurb policy{policyVersion ? ` v${policyVersion}` : ""}</b>
              <span className="node-sub">
                <span className="num node-count" data-hidden={!!caption}>
                  {items ? (
                    <>
                      {count(tally.block)} stopped · {count(tally.escalate)} held · {count(tally.allow)} passed<span className="wide-only"> of the last {count(total)}</span>
                    </>
                  ) : (
                    "Reading the latest calls"
                  )}
                </span>
                <span className="gate-caption" data-tone={caption?.tone} data-shown={!!caption} aria-live="polite">
                  {caption?.text ?? ""}
                </span>
              </span>
            </span>
          </span>
          <span className="gate-node" style={{ left: "100%" }}>
            <span className="node-dot end" />
            <span ref={paypalRing} className="node-ring" style={{ inset: -6 }} />
            <span className="node-label">
              <b>PayPal</b>
              <span className="end-sub">Sandbox</span>
            </span>
          </span>
          {resting && <Resting key={resting.id} item={resting} />}
          {flights.map(({ item, delay }) => (
            <Flight key={item.id} item={item} delay={delay} policyRing={policyRing} paypalRing={paypalRing} onCaption={showCaption} onDone={land} />
          ))}
        </div>
      </section>
    </>
  );
}

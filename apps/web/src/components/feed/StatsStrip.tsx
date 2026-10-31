"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { count, dollars } from "@/lib/format";
import { reducedMotion } from "@/lib/motion";
import type { Stats } from "@/lib/types";
import { ErrorState, Skeleton } from "../states";

function useTicker(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value) return;
    const duration = reducedMotion() ? 1 : 600;
    const began = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}

function Figure({ value, format, caption, href, index }: { value: number; format: (value: number) => string; caption: string; href?: string; index: number }) {
  const shown = useTicker(value);
  const body = (
    <>
      <span className="figure-value num" aria-hidden="true">
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
      <span className="figure-cap">{caption}</span>
    </>
  );
  const style = { "--i": index } as React.CSSProperties;
  if (href) {
    return (
      <Link href={href} className="figure rise" style={style}>
        {body}
      </Link>
    );
  }
  return (
    <div className="figure rise" style={style}>
      {body}
    </div>
  );
}

const captions = ["Spent today", "Left to spend today", "Waiting for you", "Stopped before PayPal"];

export function StatsStrip({ stats, error, onRetry }: { stats: Stats | null; error: string | null; onRetry: () => void }) {
  if (!stats && error) {
    return (
      <div className="figures" style={{ display: "block" }}>
        <ErrorState title="Today's totals did not load" message={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!stats) {
    return (
      <section className="figures" aria-label="Today" aria-busy="true">
        {captions.map((caption) => (
          <div key={caption} className="figure">
            <Skeleton style={{ height: 28, width: 120, margin: "3px 0" }} />
            <span className="figure-cap">{caption}</span>
          </div>
        ))}
      </section>
    );
  }
  return (
    <section className="figures" aria-label="Today">
      <Figure index={0} value={stats.spent_today_cents} format={dollars} caption={captions[0]} />
      <Figure index={1} value={stats.remaining_cents} format={dollars} caption={captions[1]} />
      <Figure index={2} value={stats.pending_approvals} format={count} caption={captions[2]} href="/approvals" />
      <Figure index={3} value={stats.blocked_count} format={count} caption={captions[3]} />
    </section>
  );
}

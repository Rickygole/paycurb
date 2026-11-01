"use client";

import { useEffect, useRef, useState } from "react";
import { reducedMotion } from "@/lib/motion";

const format = (value: number, decimals: number, prefix: string) => `${prefix}${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

export function Count({ value, decimals = 0, prefix = "" }: { value: number; decimals?: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || value === 0 || reducedMotion() || !("IntersectionObserver" in window)) return;
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - start) / 1400);
          setShown(value * (1 - (1 - progress) ** 4));
          if (progress < 1) frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span className="ca-count num">
      <span className="ca-count-size" aria-hidden="true">
        {format(value, decimals, prefix)}
      </span>
      <span ref={ref} className="ca-count-live" aria-hidden="true">
        {format(shown, decimals, prefix)}
      </span>
      <span className="ca-hidden">{format(value, decimals, prefix)}</span>
    </span>
  );
}

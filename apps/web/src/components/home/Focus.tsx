"use client";

import { useEffect } from "react";

export function Focus() {
  useEffect(() => {
    const loops = Array.from(document.querySelectorAll<HTMLElement>("[data-loop]"));
    if (!loops.length || !("IntersectionObserver" in window)) return;
    const seen = new Map<Element, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => seen.set(entry.target, entry.isIntersecting ? entry.intersectionRect.height : 0));
        const lead = loops.reduce((best, item) => ((seen.get(item) ?? 0) > (seen.get(best) ?? 0) ? item : best), loops[0]);
        loops.forEach((item) => (item.dataset.playing = String(item === lead && (seen.get(item) ?? 0) > 0)));
      },
      { threshold: Array.from({ length: 21 }, (_, index) => index / 20) },
    );
    loops.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
  return null;
}

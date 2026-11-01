"use client";

import { useEffect } from "react";
import { reducedMotion } from "@/lib/motion";

const selector = "[data-magnet], .ca .dialog button[type='submit']";

export function Motion() {
  useEffect(() => {
    if (reducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const pull = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(selector);
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${(((event.clientX - rect.left) / rect.width - 0.5) * 12).toFixed(1)}px`);
      target.style.setProperty("--my", `${(((event.clientY - rect.top) / rect.height - 0.5) * 8).toFixed(1)}px`);
    };
    const release = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(selector);
      if (!target || target.contains(event.relatedTarget as Node | null)) return;
      target.style.removeProperty("--mx");
      target.style.removeProperty("--my");
    };
    document.addEventListener("pointermove", pull);
    document.addEventListener("pointerout", release);
    return () => {
      document.removeEventListener("pointermove", pull);
      document.removeEventListener("pointerout", release);
    };
  }, []);
  return null;
}

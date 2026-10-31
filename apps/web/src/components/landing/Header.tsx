"use client";

import { useEffect, useRef } from "react";

function parseColor(value: string): [number, number, number, number] {
  const match = value.match(/rgba?\(([^)]+)\)/);
  if (!match) return [0, 0, 0, 0];
  const [red, green, blue, alpha = 1] = match[1].split(",").map((part) => Number.parseFloat(part));
  return [red, green, blue, alpha];
}

const luminance = ([red, green, blue]: number[]) => (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

export function Header() {
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = bar.current;
    if (!node) return;
    let lastY = window.scrollY;
    let frame = 0;

    const paint = () => {
      frame = 0;
      const y = window.scrollY;
      if (y > lastY + 4 && y > 160) node.classList.add("is-hidden");
      if (y < lastY - 4 || y <= 160) node.classList.remove("is-hidden");
      lastY = y;
      const under = document.elementsFromPoint(window.innerWidth / 2, 90).filter((element) => !node.contains(element));
      if (under.some((element) => element.classList.contains("strip"))) {
        node.dataset.ink = "mixed";
        node.style.removeProperty("--bar-bg");
        return;
      }
      for (const element of under) {
        const color = parseColor(getComputedStyle(element).backgroundColor);
        if (color[3] > 0.9) {
          node.dataset.ink = luminance(color) > 0.55 ? "dark" : "light";
          node.style.setProperty("--bar-bg", `rgb(${color[0]}, ${color[1]}, ${color[2]})`);
          return;
        }
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };

    paint();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={bar} className="bar" data-ink="dark">
      <a className="mark" href="#top" aria-label="Paycurb, back to the top">
        paycurb
      </a>
      <a className="btn btn-bar" href="#open">
        Open the live demo
      </a>
    </header>
  );
}

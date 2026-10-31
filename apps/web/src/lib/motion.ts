export const STATS_EVENT = "paycurb:stats";

export function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function bump(element: Element | null) {
  if (!element || reducedMotion()) return;
  element.animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 150, easing: "ease-out" });
}

export function askForStats() {
  window.dispatchEvent(new Event(STATS_EVENT));
}

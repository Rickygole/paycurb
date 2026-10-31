import type { Outcome } from "@/lib/types";

const words: Record<Outcome, string> = {
  allow: "Reached PayPal",
  block: "Stopped here",
  escalate: "Held for you",
};

const stopColours: Record<Outcome, [string, string]> = {
  allow: ["var(--allow-bg)", "var(--allow-ink)"],
  block: ["var(--block-bg)", "var(--block-ink)"],
  escalate: ["var(--held-bg)", "var(--held-ink)"],
};

export function RouteStrip({ decision, size = "row" }: { decision: Outcome; size?: "row" | "large" }) {
  const passed = decision === "allow";
  const [fill, stroke] = stopColours[decision] ?? stopColours.block;
  const scale = size === "large" ? 2 : 1.2;
  return (
    <span className={`route route-${size}`} title={`Agent, Paycurb policy, PayPal: ${words[decision] ?? decision}`}>
      <svg width={72 * scale} height={12 * scale} viewBox="0 0 72 12" aria-hidden="true" focusable="false">
        <path d="M10 6h22" stroke={passed ? "var(--allow-ink)" : "var(--muted)"} strokeWidth="1.5" />
        <path d="M40 6h22" stroke={passed ? "var(--allow-ink)" : "var(--control)"} strokeWidth="1.5" strokeDasharray={passed ? undefined : "2.5 3"} />
        <circle cx="6" cy="6" r="3.5" fill={passed ? "var(--allow-bg)" : "var(--muted)"} stroke={passed ? "var(--allow-ink)" : "none"} strokeWidth="1.5" />
        <circle cx="36" cy="6" r="4.25" fill={fill} stroke={stroke} strokeWidth="1.5" />
        <circle cx="66" cy="6" r="3.5" fill={passed ? "var(--allow-bg)" : "var(--surface)"} stroke={passed ? "var(--allow-ink)" : "var(--control)"} strokeWidth="1.5" />
      </svg>
      <span className="route-label">{words[decision] ?? decision}</span>
    </span>
  );
}

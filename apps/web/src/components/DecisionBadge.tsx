import type { Outcome } from "@/lib/types";
import { CheckIcon, ClockIcon, StopIcon } from "./icons";

const looks: Record<Outcome, { label: string; className: string; Icon: typeof CheckIcon }> = {
  allow: { label: "Allowed", className: "bg-allow-soft text-allow", Icon: CheckIcon },
  escalate: { label: "Needs approval", className: "bg-escalate-soft text-escalate", Icon: ClockIcon },
  block: { label: "Blocked", className: "bg-block-soft text-block", Icon: StopIcon },
};

export const outcomeLabel = (outcome: Outcome) => looks[outcome]?.label ?? outcome;

export function DecisionBadge({ decision, size = "md" }: { decision: Outcome; size?: "sm" | "md" }) {
  const look = looks[decision];
  if (!look) return <span className="text-sm text-muted">{decision}</span>;
  const { Icon } = look;
  const sizing = size === "sm" ? "gap-1 px-1.5 py-0.5 text-xs" : "gap-1.5 px-2 py-1 text-[13px]";
  return (
    <span className={`inline-flex shrink-0 items-center rounded-md font-semibold whitespace-nowrap ${sizing} ${look.className}`}>
      <Icon size={size === "sm" ? 12 : 14} strokeWidth={2.5} />
      {look.label}
    </span>
  );
}

import type { Outcome } from "@/lib/types";
import { CheckIcon, ClockIcon, StopIcon } from "./icons";

const looks: Record<Outcome, { label: string; className: string; Icon: typeof CheckIcon }> = {
  allow: { label: "Allowed", className: "status-allow", Icon: CheckIcon },
  escalate: { label: "Held for you", className: "status-held", Icon: ClockIcon },
  block: { label: "Blocked", className: "status-block", Icon: StopIcon },
};

export const outcomeLabel = (outcome: Outcome) => looks[outcome]?.label ?? outcome;

export function DecisionBadge({ decision, label }: { decision: Outcome | null; label?: string }) {
  const look = decision ? looks[decision] : null;
  if (!look) return <span className="status">{label ?? decision}</span>;
  const { Icon } = look;
  return (
    <span className={`status ${look.className}`}>
      <Icon size={14} strokeWidth={2.25} />
      {label ?? look.label}
    </span>
  );
}

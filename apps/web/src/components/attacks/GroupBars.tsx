import { percent } from "@/lib/format";
import type { AttackGroup } from "@/lib/types";
import { attackGroups, groupNames, rateOf } from "./groups";

function Bar({ label, rate, className }: { label: string; rate: number | null; className: string }) {
  const clamped = rate === null ? 0 : Math.max(0, Math.min(1, rate));
  return (
    <div className="grid grid-cols-[8.5rem_1fr_3.5rem] items-center gap-3 text-xs">
      <span className="text-muted">{label}</span>
      <span className="h-3 overflow-hidden rounded-full bg-surface-3">
        <span className={`bar-grow block h-full origin-left rounded-full ${className}`} style={{ transform: `scaleX(${clamped})` }} />
      </span>
      <span className="text-right font-semibold num">{rate === null ? "Pending" : percent(rate)}</span>
    </div>
  );
}

export function GroupBars({ groups }: { groups: AttackGroup[] }) {
  return (
    <figure className="card p-5">
      <figcaption className="mb-1 font-semibold">Attack success by group</figcaption>
      <p className="mb-4 text-xs text-muted">Share of attack scenarios where money moved that the policy would not have allowed. Lower is better.</p>
      <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted" aria-hidden="true">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-block" /> Without Paycurb
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" /> With Paycurb
        </span>
      </div>
      <ul className="space-y-4">
        {attackGroups(groups).map((group) => (
          <li key={group.group}>
            <p className="mb-1.5 text-sm font-medium">
              {group.group}. {groupNames[group.group] ?? "Other"}
            </p>
            <div className="space-y-1">
              <Bar label="Without Paycurb" rate={rateOf(group.baseline_success, group.scenarios)} className="bg-block" />
              <Bar label="With Paycurb" rate={rateOf(group.protected_success, group.scenarios)} className="bg-accent" />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}

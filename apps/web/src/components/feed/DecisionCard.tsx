import { dollars, formatTime, merchantName } from "@/lib/format";
import type { Feed } from "@/lib/types";
import { DecisionBadge } from "../DecisionBadge";

const stripes = { allow: "before:bg-allow", escalate: "before:bg-escalate", block: "before:bg-block" };

export function kindLabel(kind: string) {
  return kind.replaceAll("_", " ");
}

export function DecisionCard({ item, fresh, onOpen }: { item: Feed; fresh: boolean; onOpen: (item: Feed) => void }) {
  return (
    <li className={fresh ? "animate-enter" : undefined}>
      <button
        type="button"
        onClick={() => onOpen(item)}
        className={`card relative flex w-full items-start gap-4 overflow-hidden px-4 py-3 pl-5 text-left transition-colors before:absolute before:inset-y-0 before:left-0 before:w-1 hover:border-line-strong hover:bg-surface-2 ${stripes[item.decision] ?? ""}`}
      >
        <div className="w-36 shrink-0">
          <DecisionBadge decision={item.decision} />
          <p className="mt-1.5 text-xs text-muted num">{formatTime(item.ts)}</p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="truncate font-semibold">{merchantName(item.merchant_id, item.merchant_name)}</p>
            <p className="text-base font-bold num">{dollars(item.amount_cents)}</p>
          </div>
          <p className="mt-1 text-sm text-fg/85">{item.reason}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono font-semibold text-fg">{item.rule_id}</span>
            <span className="capitalize">{kindLabel(item.kind)}</span>
            <span className="font-mono">{item.tool}</span>
            {item.paypal_ref && <span className="font-mono">PayPal {item.paypal_ref}</span>}
          </p>
        </div>
      </button>
    </li>
  );
}

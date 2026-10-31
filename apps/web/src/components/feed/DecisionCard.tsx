import { clock, dollars, formatDateTime, hasAmount, merchantName, plainReason } from "@/lib/format";
import type { Feed } from "@/lib/types";
import { DecisionBadge } from "../DecisionBadge";
import { RouteStrip } from "./RouteStrip";

export function Amount({ cents }: { cents: number | null | undefined }) {
  if (!hasAmount(cents)) return <span className="missing" role="img" aria-label="No amount" />;
  return <>{dollars(cents)}</>;
}

export function DecisionCard({ item, fresh, index, onOpen }: { item: Feed; fresh: boolean; index: number; onOpen: (item: Feed) => void }) {
  return (
    <li className={fresh ? "arrive" : index < 8 ? "rise" : undefined} style={{ "--i": index } as React.CSSProperties}>
      <button type="button" className="drow" data-tone={item.decision} onClick={() => onOpen(item)}>
        <DecisionBadge decision={item.decision} />
        <span className="drow-main">
          <span className="drow-reason">{plainReason(item)}</span>
          <span className="drow-meta">
            {merchantName(item.merchant_id, item.merchant_name)} <span aria-hidden="true">·</span>{" "}
            <time dateTime={item.ts} title={formatDateTime(item.ts)} className="num">
              {clock(item.ts)}
            </time>
          </span>
        </span>
        <RouteStrip decision={item.decision} />
        <span className="drow-end">
          <span className="drow-amount num">
            <Amount cents={item.amount_cents} />
          </span>
          <span className="drow-ref">
            Rule {item.rule_id}
            {item.paypal_ref ? (
              <>
                {" "}
                <span aria-hidden="true">·</span> <span className="mono">{item.paypal_ref}</span>
              </>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

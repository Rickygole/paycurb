"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import { auditMerchant, stamp, toolLabel } from "@/lib/format";
import type { AuditRow } from "@/lib/types";
import { DecisionBadge } from "../DecisionBadge";
import { Amount } from "../feed/DecisionCard";
import { HashValue } from "../feed/DecisionDrawer";

export function DecisionCell({ data }: CustomCellRendererProps<AuditRow>) {
  if (!data) return null;
  return (
    <span style={{ display: "flex", height: "100%", alignItems: "center" }}>
      <DecisionBadge decision={data.decision} />
    </span>
  );
}

export function HashCell({ data }: CustomCellRendererProps<AuditRow>) {
  if (!data) return null;
  return (
    <span style={{ display: "flex", height: "100%", alignItems: "center" }}>
      <HashValue value={data.entry_hash} label={`entry hash for entry ${data.seq}`} />
    </span>
  );
}

export function MissingCell() {
  return <span className="missing" role="img" aria-label="None" />;
}

export function CompactCell({ data }: CustomCellRendererProps<AuditRow>) {
  if (!data) return null;
  return (
    <span className="audit-compact">
      <span className="audit-compact-line">
        <b>{data.merchant_id ? auditMerchant(data) : toolLabel(data.tool)}</b>
        <span className="num">
          <Amount cents={data.amount_cents} />
        </span>
      </span>
      <span className="audit-compact-line">
        <DecisionBadge decision={data.decision} />
        <span className="muted small num">
          Entry {data.seq}, {stamp(data.ts)}
        </span>
      </span>
    </span>
  );
}

"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import type { AuditRow } from "@/lib/types";
import { DecisionBadge } from "../DecisionBadge";
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

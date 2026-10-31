"use client";

import type { CustomCellRendererProps } from "ag-grid-react";
import { shortHash } from "@/lib/format";
import type { AuditRow } from "@/lib/types";
import { CopyButton } from "../CopyButton";
import { DecisionBadge } from "../DecisionBadge";

export function DecisionCell({ data }: CustomCellRendererProps<AuditRow>) {
  if (!data) return null;
  return (
    <span className="flex h-full items-center">
      <DecisionBadge decision={data.decision} size="sm" />
    </span>
  );
}

export function HashCell({ data }: CustomCellRendererProps<AuditRow>) {
  if (!data) return null;
  return (
    <span className="flex h-full items-center gap-1">
      <span className="font-mono text-xs" title={data.entry_hash}>
        {shortHash(data.entry_hash)}
      </span>
      <CopyButton text={data.entry_hash} label={`Copy entry hash for seq ${data.seq}`} />
    </span>
  );
}

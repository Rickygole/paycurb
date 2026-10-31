"use client";

import { AllCommunityModule, ModuleRegistry, type ColDef, type RowClickedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errorText } from "@/lib/api";
import { count, dollars, formatDateTime, merchantName } from "@/lib/format";
import type { AuditPage, AuditRow } from "@/lib/types";
import { CopyButton } from "../CopyButton";
import { DecisionBadge, outcomeLabel } from "../DecisionBadge";
import { Drawer, Field } from "../Drawer";
import { DownloadIcon } from "../icons";
import { Page, PageHeader } from "../Shell";
import { ErrorState } from "../states";
import { ChainStatus } from "./ChainStatus";
import { DecisionCell, HashCell } from "./cells";
import { gridTheme } from "./gridTheme";

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_LIMIT = 1000;

const columns: ColDef<AuditRow>[] = [
  { field: "seq", headerName: "Seq", width: 104, filter: "agNumberColumnFilter", sort: "desc", cellClass: "num" },
  { field: "ts", headerName: "Time", width: 215, valueFormatter: (p) => (p.value ? formatDateTime(p.value) : ""), filter: "agTextColumnFilter", cellClass: "num" },
  { field: "tool", headerName: "Tool", width: 140, filter: true, cellClass: "font-mono" },
  { field: "kind", headerName: "Kind", width: 110, filter: true },
  { colId: "merchant", headerName: "Merchant", width: 170, valueGetter: (p) => (p.data ? merchantName(p.data.merchant_id) : ""), filter: true },
  {
    colId: "amount",
    headerName: "Amount",
    width: 120,
    type: "rightAligned",
    valueGetter: (p) => (p.data ? p.data.amount_cents / 100 : null),
    valueFormatter: (p) => (p.value == null ? "" : dollars(Math.round(p.value * 100))),
    filter: "agNumberColumnFilter",
    cellClass: "num",
  },
  {
    field: "decision",
    headerName: "Decision",
    width: 178,
    cellRenderer: DecisionCell,
    filter: true,
    filterValueGetter: (p) => (p.data ? outcomeLabel(p.data.decision) : ""),
    getQuickFilterText: (p) => outcomeLabel(p.value),
  },
  { field: "rule_id", headerName: "Rule", width: 90, filter: true, cellClass: "font-mono" },
  { field: "reason", headerName: "Reason", flex: 1, minWidth: 280, filter: true, tooltipField: "reason" },
  { field: "paypal_ref", headerName: "PayPal ref", width: 190, filter: true, cellClass: "font-mono", valueFormatter: (p) => p.value ?? "" },
  { field: "entry_hash", headerName: "Entry hash", width: 180, cellRenderer: HashCell, sortable: false, filter: true },
];

const defaultColDef: ColDef<AuditRow> = { resizable: true, sortable: true };

export function AuditLog() {
  const grid = useRef<AgGridReact<AuditRow>>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const generation = useRef(0);

  const loadFrom = useCallback((start: string | null) => {
    const id = ++generation.current;
    const fetchPage = (from: string | null): Promise<void> => {
      const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (from) query.set("cursor", from);
      return api<AuditPage>(`/api/audit?${query}`).then(
        (page) => {
          if (id !== generation.current) return;
          setRows((current) => [...current, ...page.rows]);
          setCursor(page.next_cursor);
          if (page.next_cursor) return fetchPage(page.next_cursor);
          setDone(true);
          setLoading(false);
        },
        (problem) => {
          if (id !== generation.current) return;
          setError(errorText(problem));
          setLoading(false);
        },
      );
    };
    return fetchPage(start);
  }, []);

  useEffect(() => {
    loadFrom(null);
    const owned = generation;
    return () => {
      owned.current++;
    };
  }, [loadFrom]);

  function resume() {
    setLoading(true);
    setError(null);
    setDone(false);
    loadFrom(cursor ?? (rows.length ? String(rows[rows.length - 1].seq) : null));
  }

  const onRowClicked = useCallback((event: RowClickedEvent<AuditRow>) => {
    if (event.data) setSelected(event.data);
  }, []);

  const exportCsv = () => grid.current?.api.exportDataAsCsv({ fileName: `paycurb-audit-${new Date().toISOString().slice(0, 10)}.csv` });

  const progress = useMemo(() => {
    if (done) return `All ${count(rows.length)} entries loaded`;
    if (loading) return `Loading entries... ${count(rows.length)} so far`;
    return `${count(rows.length)} entries loaded, more on the server`;
  }, [done, loading, rows.length]);

  return (
    <Page wide>
      <PageHeader
        title="Audit Log"
        description="Every decision, in order, in an append only hash chain. Each entry includes the hash of the one before it, so any edit breaks the chain."
        actions={<ChainStatus />}
      />
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-sm">
          <label htmlFor="audit-search" className="label">
            Search all columns
          </label>
          <input
            id="audit-search"
            type="search"
            className="input"
            placeholder="Merchant, rule, reason, PayPal ref..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-muted num">
            {progress}
          </p>
          {!loading && (
            <button type="button" className="btn-secondary" onClick={resume}>
              {done ? "Check for new entries" : "Load more"}
            </button>
          )}
          <button type="button" className="btn-secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <DownloadIcon size={15} />
            Export CSV
          </button>
        </div>
      </div>
      {error && (
        <div className="mb-3">
          <ErrorState title="Could not load audit entries" message={error} onRetry={resume} />
        </div>
      )}
      <div className="h-[max(440px,calc(100dvh-300px))]">
        <AgGridReact<AuditRow>
          ref={grid}
          theme={gridTheme}
          rowData={rows}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          getRowId={(p) => String(p.data.seq)}
          quickFilterText={search}
          pagination
          paginationPageSize={100}
          paginationPageSizeSelector={[50, 100, 250, 500]}
          loading={loading && rows.length === 0}
          overlayNoRowsTemplate="<span>No audit entries yet. Every decision the engine makes is written here as it happens.</span>"
          onRowClicked={onRowClicked}
          onCellKeyDown={(event) => {
            const key = (event.event as KeyboardEvent | null)?.key;
            if (key === "Enter" && event.data) setSelected(event.data);
          }}
          rowClass="cursor-pointer"
          tooltipShowDelay={400}
        />
      </div>
      <footer className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-muted">
        <span>Click a row or press Enter on it to see the full record.</span>
        <span>Audit table built with AG Grid Community.</span>
      </footer>
      <Drawer open={!!selected} title={selected ? `Audit entry ${selected.seq}` : "Audit entry"} onClose={() => setSelected(null)}>
        {selected && <AuditRecord row={selected} />}
      </Drawer>
    </Page>
  );
}

function HashField({ label, value }: { label: string; value: string | null }) {
  return (
    <Field label={label} mono>
      {value ? (
        <span className="flex items-start gap-1">
          <span className="min-w-0 break-all">{value}</span>
          <CopyButton text={value} label={`Copy ${label.toLowerCase()}`} />
        </span>
      ) : (
        <span className="font-sans text-muted">None</span>
      )}
    </Field>
  );
}

function AuditRecord({ row }: { row: AuditRow }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <DecisionBadge decision={row.decision} />
        <p className="text-[15px] leading-relaxed">{row.reason}</p>
      </div>
      <dl>
        <Field label="Seq">{row.seq}</Field>
        <Field label="Time">{formatDateTime(row.ts)}</Field>
        <Field label="Merchant">{merchantName(row.merchant_id)}</Field>
        <Field label="Amount">
          <span className="font-semibold num">{dollars(row.amount_cents)}</span>
        </Field>
        <Field label="Tool" mono>
          {row.tool}
        </Field>
        <Field label="Kind">{row.kind}</Field>
        <Field label="Rule" mono>
          {row.rule_id}
        </Field>
        <Field label="Policy version">v{row.policy_version}</Field>
        <Field label="PayPal reference" mono>
          {row.paypal_ref ?? <span className="font-sans text-muted">None. This call did not reach PayPal.</span>}
        </Field>
        <Field label="Action id" mono>
          {row.action_id}
        </Field>
        <HashField label="Payload hash" value={row.payload_hash} />
        <HashField label="Previous hash" value={row.prev_hash} />
        <HashField label="Entry hash" value={row.entry_hash} />
      </dl>
    </div>
  );
}

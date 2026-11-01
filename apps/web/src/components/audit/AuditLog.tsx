"use client";

import { AllCommunityModule, ModuleRegistry, type ColDef, type RowClickedEvent } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { api, errorText } from "@/lib/api";
import { count, dollars, formatDateTime, auditMerchant, fullReason, hasAmount, stamp } from "@/lib/format";
import type { AuditPage, AuditRow } from "@/lib/types";
import { DecisionBadge, outcomeLabel } from "../DecisionBadge";
import { Drawer, Field, useLast } from "../Drawer";
import { HashValue } from "../feed/DecisionDrawer";
import { RouteStrip } from "../feed/RouteStrip";
import { Amount } from "../feed/DecisionCard";
import { DownloadIcon } from "../icons";
import { PageHeader } from "../Shell";
import { ErrorState } from "../states";
import { ChainStatus } from "./ChainStatus";
import { CompactCell, DecisionCell, HashCell, MissingCell } from "./cells";
import { gridTheme } from "./gridTheme";

ModuleRegistry.registerModules([AllCommunityModule]);

const PAGE_LIMIT = 1000;

const columns: ColDef<AuditRow>[] = [
  { field: "seq", headerName: "Entry", width: 84, sort: "desc", type: "rightAligned", cellClass: ["num", "ag-right-aligned-cell"] },
  {
    field: "ts",
    headerName: "Time",
    width: 156,
    valueFormatter: (p) => (p.value ? stamp(p.value) : ""),
    tooltipValueGetter: (p) => (p.value ? formatDateTime(p.value) : ""),
    cellClass: "num",
  },
  {
    field: "decision",
    headerName: "Decision",
    width: 160,
    minWidth: 150,
    cellRenderer: DecisionCell,
    valueFormatter: (p) => outcomeLabel(p.value),
    getQuickFilterText: (p) => outcomeLabel(p.value),
  },
  { colId: "merchant", headerName: "Merchant", width: 150, valueGetter: (p) => (p.data ? auditMerchant(p.data) : "") },
  {
    colId: "amount",
    headerName: "Amount",
    width: 108,
    type: "rightAligned",
    valueGetter: (p) => (p.data && hasAmount(p.data.amount_cents) ? p.data.amount_cents / 100 : null),
    valueFormatter: (p) => (p.value == null ? "" : dollars(Math.round(p.value * 100))),
    cellRendererSelector: (p) => (p.value == null ? { component: MissingCell } : undefined),
    cellClass: ["num", "ag-right-aligned-cell"],
  },
  { field: "rule_id", headerName: "Rule", width: 72, cellClass: "mono" },
  { colId: "reason", headerName: "Reason", flex: 1, minWidth: 340, wrapText: true, autoHeight: true, valueGetter: (p) => (p.data ? fullReason(p.data) : "") },
  {
    field: "paypal_ref",
    headerName: "PayPal reference",
    hide: true,
    width: 160,
    cellClass: "mono",
    valueFormatter: (p) => p.value ?? "",
    cellRendererSelector: (p) => (p.value ? undefined : { component: MissingCell }),
  },
  { field: "entry_hash", headerName: "Entry hash", hide: true, width: 176, cellRenderer: HashCell, sortable: false },
];

const defaultColDef: ColDef<AuditRow> = { resizable: true, sortable: true, suppressHeaderMenuButton: true };

const exportKeys = columns.map((column) => column.colId ?? String(column.field));
const phoneColumns: ColDef<AuditRow>[] = [
  { colId: "compact", headerName: "Entry", flex: 1, autoHeight: true, sortable: false, cellRenderer: CompactCell, getQuickFilterText: () => "" },
  ...columns.map((column) => ({ ...column, hide: true })),
];

const PHONE = "(max-width: 640px)";
const onPhoneChange = (change: () => void) => {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", change);
  return () => query.removeEventListener("change", change);
};
const readPhone = () => window.matchMedia(PHONE).matches;

export function AuditLog() {
  const grid = useRef<AgGridReact<AuditRow>>(null);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const shown = useLast(selected);
  const generation = useRef(0);
  const phone = useSyncExternalStore(onPhoneChange, readPhone, () => false);

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

  const exportCsv = () => grid.current?.api.exportDataAsCsv({ columnKeys: exportKeys, fileName: `paycurb-audit-${new Date().toISOString().slice(0, 10)}.csv` });

  const progress = useMemo(() => {
    if (done) return `${count(rows.length)} entries`;
    if (loading) return `Loading entries, ${count(rows.length)} so far`;
    return `${count(rows.length)} entries loaded, more on the server`;
  }, [done, loading, rows.length]);

  return (
    <>
      <PageHeader
        title="Audit"
        description="Every decision in order. Each entry carries the hash of the one before it, so an edit anywhere breaks the chain."
        actions={<ChainStatus />}
      />
      <div className="toolbar" style={{ marginTop: 0, marginBottom: 12 }}>
        <input
          type="search"
          className="input"
          style={{ width: "min(360px, 100%)", height: 36 }}
          aria-label="Search the audit log"
          placeholder="Search merchant, rule, reason or reference"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <p role="status" className="muted grow small">
          {progress}
        </p>
        {!loading && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={resume}>
            {done ? "Check for new entries" : "Load more"}
          </button>
        )}
        <button type="button" className="btn btn-sm" onClick={exportCsv} disabled={rows.length === 0}>
          <DownloadIcon size={15} />
          Export CSV
        </button>
      </div>
      {error && (
        <div style={{ marginBottom: 12 }}>
          <ErrorState title="Audit entries did not load" message={error} onRetry={resume} />
        </div>
      )}
      <div className="audit-grid" style={{ height: "max(420px, calc(100dvh - 228px))" }}>
        <AgGridReact<AuditRow>
          ref={grid}
          theme={gridTheme}
          rowData={rows}
          columnDefs={phone ? phoneColumns : columns}
          defaultColDef={defaultColDef}
          getRowId={(p) => String(p.data.seq)}
          quickFilterText={search}
          includeHiddenColumnsInQuickFilter
          loading={loading && rows.length === 0}
          overlayNoRowsTemplate='<span>No entries yet. Every decision, approval and policy change is written here as it happens. <a href="/agent">Run an agent task</a> to write the first one.</span>'
          onRowClicked={onRowClicked}
          onCellKeyDown={(event) => {
            const key = (event.event as KeyboardEvent | null)?.key;
            if (key === "Enter" && event.data) setSelected(event.data);
          }}
          rowClass="audit-row"
          tooltipShowDelay={300}
        />
      </div>
      <p className="small muted" style={{ marginTop: 10 }}>
        Select a row, or press Enter on it, for the PayPal reference and the hashes.
      </p>
      <Drawer open={selected !== null} title={shown ? `Entry ${shown.seq}` : "Entry"} onClose={() => setSelected(null)}>
        {shown && <AuditRecord row={shown} />}
      </Drawer>
    </>
  );
}

function AuditRecord({ row }: { row: AuditRow }) {
  return (
    <>
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <DecisionBadge decision={row.decision} />
          <span className="num" style={{ fontSize: 28, lineHeight: "34px", fontWeight: 500 }}>
            <Amount cents={row.amount_cents} />
          </span>
        </div>
        <p style={{ marginTop: 16, fontSize: 18, lineHeight: "26px", fontWeight: 500 }}>{fullReason(row)}</p>
        <div style={{ marginTop: 16 }}>
          <RouteStrip decision={row.decision} size="large" />
        </div>
      </section>
      <section>
        <dl>
          <Field label="Time">{formatDateTime(row.ts)}</Field>
          <Field label="Merchant">{auditMerchant(row)}</Field>
          <Field label="Tool">{row.tool}</Field>
          <Field label="Rule">{row.rule_id}</Field>
          {row.policy_version != null && <Field label="Policy version">v{row.policy_version}</Field>}
          <Field label="PayPal reference">{row.paypal_ref ? <span className="mono">{row.paypal_ref}</span> : <span className="muted">None. This call never reached PayPal.</span>}</Field>
          <Field label="Action id">
            <span className="mono">{row.action_id}</span>
          </Field>
          <Field label="Payload hash">
            <HashValue value={row.payload_hash} label="payload hash" />
          </Field>
          <Field label="Previous hash">
            <HashValue value={row.prev_hash} label="previous hash" />
          </Field>
          <Field label="Entry hash">
            <HashValue value={row.entry_hash} label="entry hash" />
          </Field>
        </dl>
      </section>
    </>
  );
}

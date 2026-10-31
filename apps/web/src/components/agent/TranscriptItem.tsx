import { parseToolOutput } from "@/lib/agentRun";
import { dollars, plainReason } from "@/lib/format";
import type { AgentEvent, Outcome } from "@/lib/types";
import { DecisionBadge } from "../DecisionBadge";
import { JsonBlock } from "../Drawer";
import { RouteStrip } from "../feed/RouteStrip";
import { AlertIcon, GateMark, WrenchIcon } from "../icons";

export type Entry = { id: number; run: number } & (AgentEvent | { type: "task"; text: string } | { type: "error"; text: string });

interface OrderItem {
  name?: string;
  sku?: string;
  quantity?: number;
  itemCost?: number;
  itemTotal?: number;
}

function Raw({ value, label }: { value: unknown; label: string }) {
  return (
    <details style={{ marginTop: 8 }}>
      <summary className="link-btn small" style={{ display: "inline", listStyle: "none" }}>
        Raw JSON
      </summary>
      <div style={{ marginTop: 8 }}>
        <JsonBlock value={value} label={label} />
      </div>
    </details>
  );
}

function ToolCall({ name, input }: { name: string; input: unknown }) {
  const data = (input && typeof input === "object" ? input : {}) as { payee?: string; items?: OrderItem[] };
  const items = Array.isArray(data.items) ? data.items : [];
  const total = items.reduce((sum, item) => sum + Math.round((item.itemTotal ?? 0) * 100), 0);
  return (
    <div className="bubble call">
      <p className="bubble-label">
        <WrenchIcon size={14} />
        Calls {name}
      </p>
      {data.payee && <p className="mono">{data.payee}</p>}
      {items.length > 0 && (
        <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
          {items.map((item, index) => (
            <li key={`${item.sku ?? item.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
              <span>
                <span className="num">{item.quantity ?? 1}</span> x {item.name ?? item.sku}
              </span>
              <span className="num">{dollars(Math.round((item.itemTotal ?? 0) * 100))}</span>
            </li>
          ))}
          <li style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--rule)", fontWeight: 500 }}>
            <span>Total</span>
            <span className="num">{dollars(total)}</span>
          </li>
        </ul>
      )}
      <Raw value={input} label={`${name} input JSON`} />
    </div>
  );
}

function ToolResult({ name, output }: { name: string; output: unknown }) {
  const result = parseToolOutput(output);
  const decision = result?.decision as Outcome | undefined;
  const order = result?.order as { id?: string; status?: string } | undefined;
  return (
    <div className="bubble">
      <p className="bubble-label">
        <GateMark size={14} className="mark" />
        Paycurb answers {name}
      </p>
      {decision ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
            <DecisionBadge decision={decision} />
            <RouteStrip decision={decision} />
          </div>
          {typeof result?.reason === "string" && (
            <p style={{ fontWeight: 500 }}>
              {plainReason({ tool: name, decision, reason: result.reason })}
              {typeof result?.rule_id === "string" && <span className="muted" style={{ fontWeight: 400 }}> · Rule {result.rule_id}</span>}
            </p>
          )}
          {order?.id && (
            <p className="muted">
              PayPal order <span className="mono">{order.id}</span>
              {order.status && <>, status {order.status}</>}
            </p>
          )}
          {typeof result?.approval_id === "string" && <p className="muted">Waiting on the Approvals page.</p>}
        </div>
      ) : (
        <p>{typeof output === "string" ? output : "The response had no decision."}</p>
      )}
      <Raw value={result ?? output} label={`${name} response JSON`} />
    </div>
  );
}

export function TranscriptItem({ entry }: { entry: Entry }) {
  if (entry.type === "task") {
    return (
      <li className="in-both arrive" style={{ display: "grid" }}>
        <p className="bubble ask">{entry.text}</p>
      </li>
    );
  }
  if (entry.type === "message") {
    return (
      <li className="in-agent arrive">
        <p className="bubble">{entry.text}</p>
      </li>
    );
  }
  if (entry.type === "tool_call") {
    return (
      <li className="in-agent arrive">
        <ToolCall name={entry.name} input={entry.input} />
      </li>
    );
  }
  if (entry.type === "tool_result") {
    return (
      <li className="in-gate arrive">
        <ToolResult name={entry.name} output={entry.output} />
      </li>
    );
  }
  if (entry.type === "error") {
    return (
      <li role="alert" className="in-both arrive">
        <p className="notice" style={{ color: "var(--block-ink)" }}>
          <AlertIcon size={16} />
          {entry.text}
        </p>
      </li>
    );
  }
  return (
    <li className="in-both" aria-label="Run finished">
      <p className="run-end">Run finished</p>
    </li>
  );
}

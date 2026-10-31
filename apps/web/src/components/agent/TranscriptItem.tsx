import { parseToolOutput } from "@/lib/agentRun";
import { dollars } from "@/lib/format";
import type { AgentEvent, Outcome } from "@/lib/types";
import { DecisionBadge } from "../DecisionBadge";
import { JsonBlock } from "../Drawer";
import { AlertIcon, BotIcon, ShieldIcon, WrenchIcon } from "../icons";

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
    <details className="mt-2">
      <summary className="cursor-pointer text-xs font-medium text-muted hover:text-fg">Show raw JSON</summary>
      <div className="mt-2">
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
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted">
        <WrenchIcon size={14} />
        Tool call <span className="font-mono text-fg">{name}</span>
      </p>
      {data.payee && (
        <p className="mt-2 text-sm">
          <span className="text-muted">Pay to </span>
          <span className="font-mono text-[13px]">{data.payee}</span>
        </p>
      )}
      {items.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {items.map((item, index) => (
            <li key={`${item.sku ?? item.name}-${index}`} className="flex justify-between gap-4">
              <span>
                {item.quantity ?? 1} x {item.name ?? item.sku}
              </span>
              <span className="num">{dollars(Math.round((item.itemTotal ?? 0) * 100))}</span>
            </li>
          ))}
          <li className="flex justify-between gap-4 border-t border-line pt-1 font-semibold">
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
    <div className="rounded-xl border border-line bg-surface-2 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold text-muted">
        <ShieldIcon size={14} />
        Paycurb response to <span className="font-mono text-fg">{name}</span>
      </p>
      {decision ? (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <DecisionBadge decision={decision} />
            {typeof result?.rule_id === "string" && <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-xs font-semibold">{result.rule_id}</span>}
          </div>
          {typeof result?.reason === "string" && <p className="text-sm">{result.reason}</p>}
          {order?.id && (
            <p className="text-sm text-muted">
              PayPal order <span className="font-mono text-fg">{order.id}</span>
              {order.status && <> with status <span className="font-mono text-fg">{order.status}</span></>}
            </p>
          )}
          {typeof result?.approval_id === "string" && (
            <p className="text-sm text-muted">
              Approval request <span className="font-mono text-fg">{result.approval_id}</span> is waiting on the Approvals page.
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm">{typeof output === "string" ? output : "The response had no decision."}</p>
      )}
      <Raw value={result ?? output} label={`${name} response JSON`} />
    </div>
  );
}

export function TranscriptItem({ entry }: { entry: Entry }) {
  if (entry.type === "task") {
    return (
      <li className="animate-enter flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-accent-contrast">{entry.text}</p>
      </li>
    );
  }
  if (entry.type === "message") {
    return (
      <li className="animate-enter flex gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-muted" aria-hidden="true">
          <BotIcon size={15} />
        </span>
        <p className="max-w-[85%] rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-2.5 text-sm leading-relaxed">{entry.text}</p>
      </li>
    );
  }
  if (entry.type === "tool_call") {
    return (
      <li className="animate-enter ml-10">
        <ToolCall name={entry.name} input={entry.input} />
      </li>
    );
  }
  if (entry.type === "tool_result") {
    return (
      <li className="animate-enter ml-10">
        <ToolResult name={entry.name} output={entry.output} />
      </li>
    );
  }
  if (entry.type === "error") {
    return (
      <li role="alert" className="animate-enter ml-10 flex items-center gap-2 rounded-lg bg-block-soft px-4 py-3 text-sm text-block">
        <AlertIcon size={15} className="shrink-0" />
        {entry.text}
      </li>
    );
  }
  return (
    <li className="flex items-center gap-3 text-xs text-muted" aria-label="Run finished">
      <span className="h-px flex-1 bg-line" />
      Run finished
      <span className="h-px flex-1 bg-line" />
    </li>
  );
}

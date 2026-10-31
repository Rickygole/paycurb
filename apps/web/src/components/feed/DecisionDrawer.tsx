import { dollars, formatDateTime, fullReason, merchantName, productName, shortHash } from "@/lib/format";
import type { Feed } from "@/lib/types";
import { CopyButton } from "../CopyButton";
import { DecisionBadge } from "../DecisionBadge";
import { Drawer, Field, JsonBlock } from "../Drawer";
import { Amount } from "./DecisionCard";
import { RouteStrip } from "./RouteStrip";

export function kindLabel(kind: string) {
  return kind.replaceAll("_", " ");
}

export function HashValue({ value, label }: { value: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span className="mono" title={value}>
        {shortHash(value)}
      </span>
      <CopyButton text={value} label={`Copy ${label}`} />
    </span>
  );
}

export function DecisionDrawer({ item, open, onClose }: { item: Feed | null; open: boolean; onClose: () => void }) {
  return (
    <Drawer open={open} title={item ? merchantName(item.merchant_id, item.merchant_name) : "Decision"} onClose={onClose}>
      {item && (
        <>
          <section>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <DecisionBadge decision={item.decision} />
              <span className="num" style={{ fontSize: 28, lineHeight: "34px", fontWeight: 500 }}>
                <Amount cents={item.amount_cents} />
              </span>
            </div>
            <p style={{ marginTop: 16, fontSize: 18, lineHeight: "26px", fontWeight: 500 }}>{fullReason(item)}</p>
            <div style={{ marginTop: 16 }}>
              <RouteStrip decision={item.decision} size="large" />
            </div>
          </section>
          <section>
            <dl>
              <Field label="Rule">{item.rule_id}</Field>
              <Field label="Tool">{item.tool}</Field>
              <Field label="Kind">
                <span style={{ textTransform: "capitalize" }}>{kindLabel(item.kind)}</span>
              </Field>
              <Field label="Time">{formatDateTime(item.ts)}</Field>
              <Field label="Policy version">v{item.policy_version}</Field>
              <Field label="PayPal reference">
                {item.paypal_ref ? <span className="mono">{item.paypal_ref}</span> : <span className="muted">None. This call never reached PayPal.</span>}
              </Field>
              <Field label="Action id">
                <span className="mono">{item.action_id}</span>
              </Field>
              <Field label="Payload hash">
                <HashValue value={item.payload_hash} label="payload hash" />
              </Field>
            </dl>
          </section>
          {item.action?.line_items?.length > 0 && (
            <section>
              <h3>Line items</h3>
              <LineItems items={item.action.line_items} />
            </section>
          )}
          <section>
            <details>
              <summary className="link-btn" style={{ display: "inline", listStyle: "none" }}>
                Show the normalized action
              </summary>
              <div style={{ marginTop: 12 }}>
                <JsonBlock value={item.action} label="Normalized action JSON" />
              </div>
            </details>
          </section>
        </>
      )}
    </Drawer>
  );
}

export function LineItems({ items }: { items: { sku: string; qty: number; unit_cents: number }[] }) {
  const total = items.reduce((sum, line) => sum + line.qty * line.unit_cents, 0);
  return (
    <table className="lines">
      <thead>
        <tr>
          <th scope="col">Item</th>
          <th scope="col" className="n">
            Qty
          </th>
          <th scope="col" className="n">
            Each
          </th>
          <th scope="col" className="n">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((line, index) => (
          <tr key={`${line.sku}-${index}`}>
            <td>
              {productName(line.sku)}
              <span className="sub">{line.sku}</span>
            </td>
            <td className="n num">{line.qty}</td>
            <td className="n num">{dollars(line.unit_cents)}</td>
            <td className="n num">{dollars(line.qty * line.unit_cents)}</td>
          </tr>
        ))}
        {items.length > 1 && (
          <tr>
            <td colSpan={3} className="muted">
              Order total
            </td>
            <td className="n num" style={{ fontWeight: 500 }}>
              {dollars(total)}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

import { dollars, formatDateTime, merchantName } from "@/lib/format";
import type { Feed } from "@/lib/types";
import { CopyButton } from "../CopyButton";
import { DecisionBadge } from "../DecisionBadge";
import { Drawer, Field, JsonBlock } from "../Drawer";
import { kindLabel } from "./DecisionCard";

export function DecisionDrawer({ item, onClose }: { item: Feed | null; onClose: () => void }) {
  return (
    <Drawer open={!!item} title="Decision details" onClose={onClose}>
      {item && (
        <div className="space-y-6">
          <section className="space-y-2">
            <DecisionBadge decision={item.decision} />
            <p className="text-[15px] leading-relaxed">{item.reason}</p>
          </section>
          <dl>
            <Field label="Merchant">{merchantName(item.merchant_id, item.merchant_name)}</Field>
            <Field label="Amount">
              <span className="font-semibold num">{dollars(item.amount_cents)}</span>
            </Field>
            <Field label="Rule" mono>
              {item.rule_id}
            </Field>
            <Field label="Kind">
              <span className="capitalize">{kindLabel(item.kind)}</span>
            </Field>
            <Field label="Tool" mono>
              {item.tool}
            </Field>
            <Field label="Time">{formatDateTime(item.ts)}</Field>
            <Field label="Policy version">v{item.policy_version}</Field>
            <Field label="PayPal reference" mono>
              {item.paypal_ref ?? <span className="font-sans text-muted">None. This call did not reach PayPal.</span>}
            </Field>
            <Field label="Action id" mono>
              {item.action_id}
            </Field>
            <Field label="Payload hash" mono>
              <span className="flex items-start gap-1">
                <span className="min-w-0 break-all">{item.payload_hash}</span>
                <CopyButton text={item.payload_hash} label="Copy payload hash" />
              </span>
            </Field>
          </dl>
          {item.action?.line_items?.length > 0 && (
            <section>
              <h3 className="eyebrow mb-2">Line items</h3>
              <LineItems items={item.action.line_items} />
            </section>
          )}
          <section>
            <h3 className="eyebrow mb-2">Normalized action</h3>
            <JsonBlock value={item.action} label="Normalized action JSON" />
          </section>
        </div>
      )}
    </Drawer>
  );
}

export function LineItems({ items }: { items: { sku: string; qty: number; unit_cents: number }[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-xs text-muted">
          <th scope="col" className="py-1.5 font-medium">SKU</th>
          <th scope="col" className="py-1.5 text-right font-medium">Qty</th>
          <th scope="col" className="py-1.5 text-right font-medium">Unit</th>
          <th scope="col" className="py-1.5 text-right font-medium">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((line, index) => (
          <tr key={`${line.sku}-${index}`} className="border-b border-line last:border-b-0">
            <td className="py-1.5 font-mono text-[13px]">{line.sku}</td>
            <td className="py-1.5 text-right num">{line.qty}</td>
            <td className="py-1.5 text-right num">{dollars(line.unit_cents)}</td>
            <td className="py-1.5 text-right font-semibold num">{dollars(line.qty * line.unit_cents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

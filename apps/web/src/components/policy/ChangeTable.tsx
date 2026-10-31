import { changedKeys, keyLabel, showValue } from "@/lib/diff";

export function ChangeTable({ before, after, beforeLabel, afterLabel }: { before: unknown; after: unknown; beforeLabel: string; afterLabel: string }) {
  const changes = changedKeys(before, after);
  if (changes.length === 0) return <p className="text-sm text-muted">No rule values differ from {beforeLabel.toLowerCase()}.</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <caption className="sr-only">
          Changed keys between {beforeLabel} and {afterLabel}
        </caption>
        <thead>
          <tr className="border-b border-line bg-surface-2 text-left text-xs text-muted">
            <th scope="col" className="px-3 py-2 font-medium">Rule</th>
            <th scope="col" className="px-3 py-2 font-medium">{beforeLabel}</th>
            <th scope="col" className="px-3 py-2 font-medium">{afterLabel}</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.key} className="border-b border-line last:border-b-0">
              <th scope="row" className="px-3 py-2 text-left font-medium capitalize">
                {keyLabel(change.key)}
                <span className="block font-mono text-[11px] font-normal text-muted normal-case">{change.key}</span>
              </th>
              <td className="px-3 py-2 align-top">
                <span className="rounded bg-block-soft px-1.5 py-0.5 text-block line-through decoration-1">{showValue(change.key, change.before)}</span>
              </td>
              <td className="px-3 py-2 align-top">
                <span className="rounded bg-allow-soft px-1.5 py-0.5 font-semibold text-allow">{showValue(change.key, change.after)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

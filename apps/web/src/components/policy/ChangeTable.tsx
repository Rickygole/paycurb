import { changedKeys, keyLabel, showValue } from "@/lib/diff";

export function ChangeTable({ before, after, beforeLabel, afterLabel }: { before: unknown; after: unknown; beforeLabel: string; afterLabel: string }) {
  const changes = changedKeys(before, after);
  if (changes.length === 0) return <p className="muted">Nothing differs from {beforeLabel.toLowerCase()}.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="lines">
        <caption className="sr-only">
          Rules that differ between {beforeLabel} and {afterLabel}
        </caption>
        <thead>
          <tr>
            <th scope="col">Rule</th>
            <th scope="col">{beforeLabel}</th>
            <th scope="col">{afterLabel}</th>
          </tr>
        </thead>
        <tbody>
          {changes.map((change) => (
            <tr key={change.key}>
              <th scope="row" style={{ textAlign: "left", fontWeight: 500, textTransform: "capitalize", padding: "9px 8px 9px 0" }}>
                {keyLabel(change.key)}
              </th>
              <td className="muted" style={{ textDecoration: "line-through" }}>
                {showValue(change.key, change.before)}
              </td>
              <td style={{ fontWeight: 500 }}>{showValue(change.key, change.after)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

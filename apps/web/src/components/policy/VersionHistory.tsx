import { dayLabel } from "@/lib/format";
import { policySummary } from "@/lib/policySummary";
import type { ActivePolicy, PolicyVersion } from "@/lib/types";
import { ChevronRightIcon } from "../icons";
import { ErrorState, Skeleton } from "../states";
import { ChangeTable } from "./ChangeTable";

export function VersionHistory({ versions, active, error, onRetry }: { versions: PolicyVersion[] | null; active: ActivePolicy | null; error: string | null; onRetry: () => void }) {
  if (!versions && error) return <ErrorState title="Version history did not load" message={error} onRetry={onRetry} />;
  if (!versions) {
    return (
      <div className="panel" role="status" style={{ padding: 20, display: "grid", gap: 16 }}>
        <span className="sr-only">Loading versions</span>
        <Skeleton style={{ height: 16, width: "80%" }} />
        <Skeleton style={{ height: 16, width: "70%" }} />
      </div>
    );
  }
  if (versions.length === 0) return <div className="empty">No versions yet. Compile and activate your first policy above.</div>;
  return (
    <ul className="panel versions">
      {[...versions]
        .sort((a, b) => b.version - a.version)
        .map((entry) => (
          <li key={entry.version}>
            <details>
              <summary>
                <span className="ver num">v{entry.version}</span>
                <span className="one-line">
                  {entry.active && <span className="status status-allow" style={{ marginRight: 10 }}>Active</span>}
                  {policySummary(entry.policy, entry.source_text)}
                </span>
                <span className="when muted num">{dayLabel(entry.created_at)}</span>
                <ChevronRightIcon size={16} />
              </summary>
              <div className="detail">
                <div>
                  <h3 className="field-label">Rules as written</h3>
                  <p style={{ whiteSpace: "pre-wrap" }}>{entry.source_text || <span className="muted">Edited as JSON, no rules text.</span>}</p>
                </div>
                {!entry.active && entry.policy && active && (
                  <div>
                    <h3 className="field-label">Against active v{active.version}</h3>
                    <ChangeTable before={active.policy} after={entry.policy} beforeLabel={`Active v${active.version}`} afterLabel={`v${entry.version}`} />
                  </div>
                )}
              </div>
            </details>
          </li>
        ))}
    </ul>
  );
}

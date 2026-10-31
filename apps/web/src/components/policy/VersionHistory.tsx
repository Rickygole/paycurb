import { formatDateTime } from "@/lib/format";
import type { ActivePolicy, PolicyVersion } from "@/lib/types";
import { ErrorState, LoadingBlock } from "../states";
import { ChangeTable } from "./ChangeTable";

export function VersionHistory({
  versions,
  active,
  error,
  onRetry,
}: {
  versions: PolicyVersion[] | null;
  active: ActivePolicy | null;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <section aria-labelledby="history-title" className="mt-10">
      <h2 id="history-title" className="mb-3 text-lg font-semibold">
        Version history
      </h2>
      {!versions && !error && <LoadingBlock label="Loading versions" rows={2} />}
      {!versions && error && <ErrorState title="Could not load version history" message={error} onRetry={onRetry} />}
      {versions && versions.length === 0 && <p className="text-sm text-muted">No versions yet. Compile and activate your first policy above.</p>}
      {versions && versions.length > 0 && (
        <ul className="space-y-2">
          {[...versions]
            .sort((a, b) => b.version - a.version)
            .map((entry) => (
              <li key={entry.version}>
                <details className="card group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 hover:bg-surface-2 [&::-webkit-details-marker]:hidden">
                    <span className="font-mono text-sm font-semibold">v{entry.version}</span>
                    {entry.active && <span className="rounded-full bg-allow-soft px-2 py-0.5 text-xs font-semibold text-allow">Active</span>}
                    <span className="min-w-0 flex-1 truncate text-sm text-muted">{entry.source_text}</span>
                    <span className="hidden text-xs text-muted sm:inline num">{formatDateTime(entry.created_at)}</span>
                    <span aria-hidden="true" className="text-muted transition-transform group-open:rotate-90">
                      ›
                    </span>
                  </summary>
                  <div className="space-y-4 border-t border-line px-4 py-4">
                    <div>
                      <h3 className="eyebrow mb-1.5">Rules as written</h3>
                      <p className="text-sm whitespace-pre-wrap">{entry.source_text}</p>
                    </div>
                    {!entry.active && (
                      <div>
                        <h3 className="eyebrow mb-1.5">Changed keys against active v{active?.version ?? "?"}</h3>
                        {entry.policy && active ? (
                          <ChangeTable before={active.policy} after={entry.policy} beforeLabel={`Active v${active.version}`} afterLabel={`v${entry.version}`} />
                        ) : (
                          <p className="text-sm text-muted">The server did not send the compiled rules for this version, so a key by key comparison is not available.</p>
                        )}
                      </div>
                    )}
                  </div>
                </details>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

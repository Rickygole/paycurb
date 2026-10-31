import Link from "next/link";
import { count, dollars } from "@/lib/format";
import type { Stats } from "@/lib/types";
import { ErrorState, Skeleton } from "../states";

function Tile({ label, value, hint, tone, href }: { label: string; value: string; hint: string; tone?: "escalate" | "block"; href?: string }) {
  const valueColor = tone === "escalate" ? "text-escalate" : tone === "block" ? "text-block" : "text-fg";
  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tracking-tight num ${valueColor}`}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{hint}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="card block p-4 transition-colors hover:border-line-strong">
        {body}
      </Link>
    );
  }
  return <div className="card p-4">{body}</div>;
}

export function StatsStrip({ stats, error, onRetry }: { stats: Stats | null; error: string | null; onRetry: () => void }) {
  if (!stats && error) return <ErrorState title="Could not load today's totals" message={error} onRetry={onRetry} />;
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status">
        <span className="sr-only">Loading today&apos;s totals</span>
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-[98px]" />
        ))}
      </div>
    );
  }
  const total = stats.spent_today_cents + stats.remaining_cents;
  const used = total > 0 ? Math.round((stats.spent_today_cents / total) * 100) : 0;
  return (
    <section aria-label="Today" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tile label="Spent today" value={dollars(stats.spent_today_cents)} hint={`${used}% of the daily limit`} />
      <Tile label="Remaining budget" value={dollars(stats.remaining_cents)} hint="Left before the daily limit" />
      <Tile
        label="Pending approvals"
        value={count(stats.pending_approvals)}
        hint={stats.pending_approvals === 0 ? "Nothing waiting on you" : "Waiting on your decision"}
        tone={stats.pending_approvals > 0 ? "escalate" : undefined}
        href="/approvals"
      />
      <Tile label="Blocked today" value={count(stats.blocked_count)} hint="Calls that never reached PayPal" tone={stats.blocked_count > 0 ? "block" : undefined} />
    </section>
  );
}

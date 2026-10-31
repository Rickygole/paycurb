import type { ReactNode } from "react";
import { AlertIcon, InboxIcon } from "./icons";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-skeleton rounded-md bg-surface-3 ${className}`} />;
}

export function LoadingBlock({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-block/30 bg-block-soft p-4 text-sm">
      <AlertIcon size={18} className="mt-0.5 shrink-0 text-block" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{title}</p>
        <p className="mt-0.5 break-words text-muted">{message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary shrink-0">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
      <div className="mb-3 text-muted">{icon ?? <InboxIcon size={28} />}</div>
      <p className="font-semibold text-fg">{title}</p>
      {children && <div className="mt-1 max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

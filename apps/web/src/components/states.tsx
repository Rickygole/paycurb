import type { CSSProperties, ReactNode } from "react";
import { AlertIcon } from "./icons";

export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`sk ${className}`} style={style} />;
}

export function LoadingBlock({ label, rows = 3, height = 64 }: { label: string; rows?: number; height?: number }) {
  return (
    <div role="status" style={{ display: "grid", gap: 12 }}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} style={{ height }} />
      ))}
    </div>
  );
}

export function ErrorState({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="problem">
      <AlertIcon size={18} />
      <p>
        <strong style={{ fontWeight: 500 }}>{title}.</strong> <span className="muted">{message}</span>
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-sm">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p style={{ maxWidth: "52ch" }}>{children}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

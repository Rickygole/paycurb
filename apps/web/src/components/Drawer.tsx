"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { XIcon } from "./icons";

export function useLast<T>(value: T | null) {
  const [last, setLast] = useState(value);
  if (value !== null && value !== last) setLast(value);
  return value ?? last;
}

export function Drawer({ open, title, onClose, children }: { open: boolean; title: ReactNode; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="drawer-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div style={{ minHeight: "100%" }}>
        <header className="drawer-head">
          <h2 id="drawer-title">{title}</h2>
          <button type="button" onClick={onClose} className="btn btn-icon" aria-label="Close panel">
            <XIcon size={18} />
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </div>
    </dialog>
  );
}

export function Field({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="kv">
      <dt>{label}</dt>
      <dd className={mono ? "mono" : undefined}>{children}</dd>
    </div>
  );
}

export function JsonBlock({ value, label }: { value: unknown; label: string }) {
  return (
    <pre aria-label={label} tabIndex={0} className="code-block">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "./icons";

export function Drawer({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
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
      {open && (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
            <h2 id="drawer-title" className="text-base font-semibold">
              {title}
            </h2>
            <button type="button" onClick={onClose} className="btn-secondary px-2!" aria-label="Close panel">
              <XIcon size={16} />
            </button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </div>
      )}
    </dialog>
  );
}

export function Field({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 border-b border-line py-2 text-sm last:border-b-0">
      <dt className="text-muted">{label}</dt>
      <dd className={`min-w-0 break-words ${mono ? "font-mono text-[13px]" : ""}`}>{children}</dd>
    </div>
  );
}

export function JsonBlock({ value, label }: { value: unknown; label: string }) {
  return (
    <pre aria-label={label} tabIndex={0} className="max-h-96 overflow-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-[12.5px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "./icons";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy(event: React.MouseEvent) {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : label}
      title={copied ? "Copied" : label}
      className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-surface-3 hover:text-fg"
    >
      {copied ? <CheckIcon size={13} className="text-allow" /> : <CopyIcon size={13} />}
    </button>
  );
}

"use client";

import { useState } from "react";

export function Code({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <figure className="doc-code">
      <figcaption>
        <span>{label}</span>
        <button type="button" className="btn btn-quiet btn-sm" onClick={copy}>
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
          <span className="sr-only"> {label}</span>
        </button>
      </figcaption>
      <pre tabIndex={0} className="code-block">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

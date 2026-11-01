"use client";

import { useState } from "react";
import { connect } from "./copy";

export function CodeBlock({ label, code }: { label: string; code: string }) {
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
    <div className="code-panel code-block" data-ui>
      <div className="code-head">
        <p>{label}</p>
        <button type="button" className="copy-btn" onClick={copy}>
          <span aria-live="polite">{copied ? connect.copied : connect.copy}</span>
          <span className="visually-hidden"> {label}</span>
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

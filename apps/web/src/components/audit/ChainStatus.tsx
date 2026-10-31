"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { count } from "@/lib/format";
import type { ChainCheck } from "@/lib/types";
import { AlertIcon, ShieldCheckIcon, ShieldOffIcon } from "../icons";

function Badge({ check, error, busy }: { check: ChainCheck | null; error: string | null; busy: boolean }) {
  if (busy && !check) return <span className="status">Checking the chain</span>;
  if (error) {
    return (
      <span className="status" title={error}>
        <AlertIcon size={14} />
        Chain not checked
      </span>
    );
  }
  if (!check) return null;
  if (check.ok) {
    return (
      <span key={`ok-${check.checked}`} className="status status-allow arrive">
        <ShieldCheckIcon size={14} />
        <span>
          Chain verified, <span className="num">{count(check.checked)}</span> entries
        </span>
      </span>
    );
  }
  return (
    <span key="broken" className="status status-block arrive">
      <ShieldOffIcon size={14} />
      <span>
        Chain broken at entry <span className="num">{check.first_broken_seq ?? "unknown"}</span>
      </span>
    </span>
  );
}

export function ChainStatus() {
  const [check, setCheck] = useState<ChainCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(
    () =>
      api<ChainCheck>("/api/audit/verify").then(
        (result) => {
          setCheck(result);
          setError(null);
          setBusy(false);
        },
        (problem) => {
          setError(errorText(problem));
          setBusy(false);
        },
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span role="status" aria-live="polite">
        <Badge check={check} error={error} busy={busy} />
      </span>
      <button
        type="button"
        className="btn btn-sm"
        onClick={() => {
          setBusy(true);
          load();
        }}
        disabled={busy}
      >
        {busy ? "Verifying" : "Verify"}
      </button>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "@/lib/api";
import { count } from "@/lib/format";
import type { ChainCheck } from "@/lib/types";
import { AlertIcon, RefreshIcon, ShieldCheckIcon, ShieldOffIcon } from "../icons";

const pill = "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-semibold";

function Badge({ check, error, busy }: { check: ChainCheck | null; error: string | null; busy: boolean }) {
  if (busy && !check) return <span className={`${pill} bg-surface-3 text-muted`}>Verifying chain...</span>;
  if (error) {
    return (
      <span className={`${pill} bg-escalate-soft text-escalate`} title={error}>
        <AlertIcon size={15} />
        Could not verify chain
      </span>
    );
  }
  if (!check) return null;
  if (check.ok) {
    return (
      <span className={`${pill} bg-allow-soft text-allow`}>
        <ShieldCheckIcon size={15} />
        Chain verified
        <span className="font-normal num">({count(check.checked)} entries)</span>
      </span>
    );
  }
  return (
    <span className={`${pill} bg-block-soft text-block`}>
      <ShieldOffIcon size={15} />
      Chain broken at seq <span className="num">{check.first_broken_seq ?? "unknown"}</span>
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

  function verify() {
    setBusy(true);
    load();
  }

  return (
    <div className="flex items-center gap-2">
      <span role="status" aria-live="polite">
        <Badge check={check} error={error} busy={busy} />
      </span>
      <button type="button" className="btn-secondary" onClick={verify} disabled={busy}>
        <RefreshIcon size={15} className={busy ? "animate-spin" : undefined} />
        {busy ? "Verifying..." : "Verify"}
      </button>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { useApi } from "@/lib/api";
import { setupProgress } from "@/lib/setup";
import type { ApprovalCard, Feed, PolicyVersion } from "@/lib/types";
import { CheckIcon, XIcon } from "../icons";

const KEY = "paycurb.setup.dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function onStorage(change: () => void) {
  window.addEventListener("storage", change);
  return () => window.removeEventListener("storage", change);
}

function CopyEndpoint({ endpoint }: { endpoint: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="btn btn-sm" onClick={copy}>
      <span aria-live="polite">{copied ? "Copied" : "Copy the MCP endpoint"}</span>
    </button>
  );
}

export function Setup({ endpoint }: { endpoint: string }) {
  const stored = useSyncExternalStore(onStorage, readDismissed, () => true);
  const [hidden, setHidden] = useState(false);
  const versions = useApi<PolicyVersion[]>("/api/policy/versions", 10000);
  const decisions = useApi<Feed[]>("/api/decisions?limit=200", 10000);
  const approvals = useApi<ApprovalCard[]>("/api/approvals", 10000);

  const loaded = versions.data !== null && decisions.data !== null && approvals.data !== null;
  const progress = loaded ? setupProgress({ versions: versions.data!, decisions: decisions.data!, approvals: approvals.data! }) : null;

  if (stored || hidden) return null;
  if (progress && Object.values(progress).every(Boolean)) return null;

  function dismiss() {
    setHidden(true);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      return;
    }
  }

  const steps = [
    {
      id: "policy",
      title: "Write your policy in plain English",
      text: "Say what the agent may spend, where, and what needs you. Nothing applies until you activate it.",
      done: progress?.policy,
      action: (
        <Link href="/policy" className="btn btn-sm">
          Write your policy
        </Link>
      ),
    },
    {
      id: "agent",
      title: "Connect your agent",
      text: (
        <>
          Point your MCP client at the endpoint and name it with the x-agent-id header. <Link href="/connect" className="link-btn">See the setup guide</Link>
        </>
      ),
      done: progress?.agent,
      action: <CopyEndpoint endpoint={endpoint} />,
    },
    {
      id: "request",
      title: "Send a first payment request",
      text: "Ask the agent to buy something. Its decision lands in the feed below.",
      done: progress?.request,
      action: (
        <Link href="/agent" className="btn btn-sm">
          Run an agent task
        </Link>
      ),
    },
    {
      id: "approval",
      title: "Approve a held order",
      text: "Orders over your approval line wait for you. Approve one and the proxy pays it.",
      done: progress?.approval,
      action: (
        <Link href="/approvals" className="btn btn-sm">
          Open approvals
        </Link>
      ),
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <section className="panel setup" aria-labelledby="setup-title">
      <header className="panel-head">
        <h2 id="setup-title">Set up your workspace</h2>
        <div className="setup-end">
          <p className="small muted" role="status">
            {progress ? `${doneCount} of ${steps.length} done` : "Checking your workspace"}
          </p>
          <button type="button" className="btn btn-icon" onClick={dismiss} aria-label="Hide the setup steps">
            <XIcon size={16} />
          </button>
        </div>
      </header>
      <ol className="setup-steps">
        {steps.map((step, index) => (
          <li key={step.id} data-done={step.done ? true : undefined}>
            <span className="setup-mark num" aria-hidden="true">
              {step.done ? <CheckIcon size={14} strokeWidth={2.5} /> : index + 1}
            </span>
            <div className="setup-text">
              <h3>
                {step.title}
                {step.done && <span className="sr-only">, done</span>}
              </h3>
              <p className="muted small">{step.text}</p>
            </div>
            <div className="setup-action">{step.done ? <span className="small muted">Done</span> : step.action}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}

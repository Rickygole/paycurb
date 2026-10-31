"use client";

import "./ledger.css";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, errorText, postJson } from "@/lib/api";
import { AlertIcon, GateMark } from "./icons";
import { ThemeToggle } from "./ThemeToggle";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await postJson("/api/login", { password });
      router.replace("/feed");
    } catch (problem) {
      setError(problem instanceof ApiError && problem.status === 401 ? "That password is not correct." : errorText(problem));
      setBusy(false);
    }
  }

  return (
    <div className="ledger" style={{ display: "grid", placeItems: "center", padding: "40px 16px" }}>
      <div style={{ position: "fixed", top: 8, right: 16 }}>
        <ThemeToggle />
      </div>
      <main className="rise" style={{ width: "min(380px, 100%)" }}>
        <p className="brand" style={{ marginBottom: 28 }}>
          <GateMark size={26} className="mark" />
          Paycurb
        </p>
        <h1 className="title">Sign in</h1>
        <p className="lede" style={{ marginBottom: 24 }}>
          The payment firewall between your shopping agent and PayPal.
        </p>
        <form onSubmit={submit} className="panel panel-pad" style={{ display: "grid", gap: 16 }} noValidate>
          <div>
            <label htmlFor="password" className="field-label">
              Owner password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="input"
            />
          </div>
          {error && (
            <p id="login-error" role="alert" className="notice" style={{ color: "var(--block-ink)" }}>
              <AlertIcon size={16} />
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ height: 40 }} disabled={busy || password.length === 0}>
            {busy ? "Signing in" : "Sign in"}
          </button>
        </form>
        <p className="small muted" style={{ marginTop: 16 }}>
          Runs against the PayPal sandbox only.
        </p>
      </main>
    </div>
  );
}

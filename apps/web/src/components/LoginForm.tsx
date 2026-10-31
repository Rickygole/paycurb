"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorText, postJson } from "@/lib/api";
import { AlertIcon, ShieldIcon } from "./icons";
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
      setError(errorText(problem));
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-contrast shadow-pop">
            <ShieldIcon size={26} strokeWidth={2.25} />
          </span>
          <h1 className="text-2xl font-bold tracking-tight">Sign in to Paycurb</h1>
          <p className="mt-1.5 text-sm text-muted">The payment firewall between your shopping agent and PayPal.</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-6" noValidate>
          <div>
            <label htmlFor="password" className="label">
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
            <p id="login-error" role="alert" className="flex items-center gap-2 text-sm text-block">
              <AlertIcon size={15} className="shrink-0" />
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={busy || password.length === 0}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">Runs against the PayPal sandbox only.</p>
      </div>
    </div>
  );
}

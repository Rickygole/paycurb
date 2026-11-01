"use client";

import "./ledger.css";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ApiError, errorText, postJson } from "@/lib/api";
import { AlertIcon, CheckIcon } from "./icons";
import { LogoGlyph } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

function problemText(problem: unknown) {
  if (problem instanceof ApiError && problem.status === 401) return "That password is not correct. Check it and try again.";
  if (problem instanceof ApiError && problem.status === 429) return "Too many sign in attempts from this address. Wait a minute, then try again.";
  return errorText(problem);
}

export function LoginForm({ facts, demoPassword }: { facts: string[]; demoPassword: string | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"password" | "demo" | null>(null);

  async function signIn(value: string, via: "password" | "demo") {
    setBusy(via);
    setError(null);
    try {
      await postJson("/api/login", { password: value });
      router.replace("/feed");
    } catch (problem) {
      setError(via === "demo" && problem instanceof ApiError && problem.status === 401 ? "The demo workspace did not open. Try again, or sign in with the owner password." : problemText(problem));
      setBusy(null);
      input.current?.focus();
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password) signIn(password, "password");
  }

  function signInDemo() {
    if (!demoPassword) return;
    setPassword(demoPassword);
    signIn(demoPassword, "demo");
  }

  return (
    <div className="ledger login">
      <div className="login-theme">
        <ThemeToggle />
      </div>
      <section className="login-story" aria-label="About Paycurb">
        <p className="brand">
          <span className="mark">
            <LogoGlyph size={20} />
          </span>
          Paycurb
        </p>
        <div className="login-story-body">
          <p className="login-statement">Your agent asks to pay. Paycurb checks the order against your rules before PayPal sees it.</p>
          <p className="lede">Each request is allowed, held for you, or blocked, with the reason in plain English.</p>
          <ul className="login-facts">
            {facts.map((fact) => (
              <li key={fact}>
                <CheckIcon size={16} />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <main className="login-main">
        <div className="login-card rise">
          <h1 className="title">Sign in to Paycurb</h1>
          <p className="lede">Enter the owner password for this workspace.</p>
          <form onSubmit={submit} className="panel panel-pad login-form" noValidate>
            <div>
              <label htmlFor="password" className="field-label">
                Owner password
              </label>
              <div className="password-field">
                <input
                  ref={input}
                  id="password"
                  name="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  autoFocus
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "login-error" : undefined}
                  className="input"
                />
                <button type="button" className="btn btn-quiet btn-sm reveal" onClick={() => setVisible((value) => !value)} aria-pressed={visible} aria-controls="password">
                  {visible ? "Hide" : "Show"}
                  <span className="sr-only"> password</span>
                </button>
              </div>
            </div>
            {error && (
              <p id="login-error" role="alert" className="notice" style={{ color: "var(--block-ink)" }}>
                <AlertIcon size={16} />
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary login-submit" disabled={busy !== null || password.length === 0}>
              {busy === "password" ? "Signing in" : "Sign in"}
            </button>
            {demoPassword && (
              <button type="button" className="btn btn-outline login-submit" onClick={signInDemo} disabled={busy !== null} aria-busy={busy === "demo"}>
                {busy === "demo" && <span className="spinner" aria-hidden="true" />}
                {busy === "demo" ? "Opening the demo workspace" : "Use the demo workspace"}
              </button>
            )}
          </form>
          <p className="small muted login-note">This is a shared sandbox workspace. Nothing here moves real money.</p>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { dialog } from "./copy";

const destinations = dialog.destinations;

export function OpenDemo() {
  const router = useRouter();
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "");
  const [destination, setDestination] = useState(destinations[0]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      if (!response.ok) throw new Error("wrong");
      router.push(destination.path);
    } catch {
      setError(dialog.error);
      setPending(false);
    }
  }

  return (
    <form className="dialog" data-ui onSubmit={submit} aria-labelledby="open-title">
      <h3 id="open-title">{dialog.title}</h3>
      <label htmlFor="demo-password">{dialog.label}</label>
      <input id="demo-password" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={dialog.placeholder} />
      <p className="hint">{dialog.hint}</p>
      <div role="radiogroup" aria-label={dialog.group} className="segments">
        {destinations.map((item) => (
          <button key={item.id} type="button" role="radio" aria-checked={item.id === destination.id} className="segment" onClick={() => setDestination(item)}>
            {item.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="problem">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-solid" disabled={pending || password.length === 0}>
        {pending ? dialog.pending : dialog.submit}
      </button>
    </form>
  );
}

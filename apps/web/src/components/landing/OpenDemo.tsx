"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

const destinations = [
  { id: "feed", label: "Live Feed", path: "/feed" },
  { id: "agent", label: "Demo Agent", path: "/agent" },
];

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
      setError("That password did not work. Check it and try again.");
      setPending(false);
    }
  }

  return (
    <form className="dialog" data-ui onSubmit={submit} aria-labelledby="open-title">
      <h3 id="open-title">Open the live demo</h3>
      <label htmlFor="demo-password">Demo password</label>
      <input id="demo-password" type="password" autoComplete="off" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter the demo password" />
      <p className="hint">The demo password is public. Everything runs against the PayPal sandbox, so no real money moves.</p>
      <div role="radiogroup" aria-label="Where to start" className="segments">
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
        {pending ? "Opening..." : "Open the live demo"}
      </button>
    </form>
  );
}

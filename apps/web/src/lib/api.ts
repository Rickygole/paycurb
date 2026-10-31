"use client";

import { useCallback, useEffect, useState } from "react";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body.error === "string" ? body.error : `The server answered with status ${response.status}. Check that the proxy is running.`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export const postJson = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export function errorText(error: unknown) {
  if (error instanceof ApiError && error.status === 401) return "Your session ended. Sign in again to continue.";
  if (error instanceof TypeError) return "The server could not be reached. Check that the proxy is running.";
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function useApi<T>(path: string | null, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(0);

  const load = useCallback(
    () =>
      path === null
        ? Promise.resolve()
        : api<T>(path).then(
        (next) => {
          setData(next);
          setError(null);
          setStatus(200);
          setLoading(false);
        },
        (problem) => {
          setError(errorText(problem));
          setStatus(problem instanceof ApiError ? problem.status : 0);
          setLoading(false);
        },
      ),
    [path],
  );

  useEffect(() => {
    load();
    if (!refreshMs) return;
    const timer = setInterval(load, refreshMs);
    return () => clearInterval(timer);
  }, [load, refreshMs]);

  return { data, error, status, loading, reload: load, setData };
}

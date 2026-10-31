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
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  });
  const body = await response.json().catch(() => null);
  if (response.status === 401 && !path.startsWith("/api/login") && typeof window !== "undefined") {
    window.location.href = "/login";
  }
  if (!response.ok) {
    const message = body && typeof body.error === "string" ? body.error : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

export const postJson = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });

export function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export function useApi<T>(path: string, refreshMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const next = await api<T>(path);
      setData(next);
      setError(null);
    } catch (problem) {
      setError(errorText(problem));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
    if (!refreshMs) return;
    const timer = setInterval(() => void reload(), refreshMs);
    return () => clearInterval(timer);
  }, [reload, refreshMs]);

  return { data, error, loading, reload, setData };
}

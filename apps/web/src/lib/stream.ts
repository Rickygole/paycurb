"use client";

import { useEffect, useRef, useState } from "react";

export type StreamStatus = "connecting" | "live" | "down";

export function useEventStream(events: string[], onEvent: (name: string, data: unknown) => void) {
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const handler = useRef(onEvent);
  const names = events.join(",");

  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.onopen = () => setStatus("live");
    source.onerror = () => setStatus(source.readyState === EventSource.CLOSED ? "down" : "connecting");
    for (const name of names.split(",")) {
      source.addEventListener(name, (event) => {
        try {
          handler.current(name, JSON.parse((event as MessageEvent).data));
        } catch {
          return;
        }
      });
    }
    return () => source.close();
  }, [names]);

  return status;
}

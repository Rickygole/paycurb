import { EventEmitter } from "node:events";

export type ProxyEvent = { type: "decision"; action_id: string } | { type: "approval"; id: string };

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export const publish = (event: ProxyEvent) => emitter.emit("event", event);

export function subscribe(listener: (event: ProxyEvent) => void): () => void {
  emitter.on("event", listener);
  return () => emitter.off("event", listener);
}

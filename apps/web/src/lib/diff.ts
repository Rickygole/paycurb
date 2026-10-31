import { dollars } from "./format";

export interface KeyChange {
  key: string;
  before: unknown;
  after: unknown;
}

function flatten(value: unknown, prefix = "", into: Record<string, unknown> = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      flatten(inner, prefix ? `${prefix}.${key}` : key, into);
    }
  } else if (prefix) {
    into[prefix] = value;
  }
  return into;
}

export function changedKeys(before: unknown, after: unknown): KeyChange[] {
  const left = flatten(before);
  const right = flatten(after);
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].filter((key) => key !== "version").sort();
  return keys
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .map((key) => ({ key, before: left[key], after: right[key] }));
}

export function showValue(key: string, value: unknown) {
  if (value === undefined) return "Not set";
  if (Array.isArray(value)) return value.length ? value.join(", ") : "None";
  if (typeof value === "number" && key.endsWith("cents")) return dollars(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function keyLabel(key: string) {
  return key.replaceAll(".", " ").replaceAll("_", " ").replace(/\bcents\b/, "").trim();
}

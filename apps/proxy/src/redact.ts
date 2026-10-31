const cardNumber = /\b\d{13,19}\b/g;

export function redactText(text: string): string {
  return text.replace(cardNumber, "[redacted]");
}

export function redact<T>(value: T): T {
  if (typeof value === "string") return redactText(value) as T;
  if (Array.isArray(value)) return value.map(redact) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, redact(inner)])) as T;
  }
  return value;
}

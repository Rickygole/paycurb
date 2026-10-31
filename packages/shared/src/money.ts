export const formatUsd = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function toCents(value: number | string): number {
  const text = typeof value === "number" ? value.toFixed(2) : value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw new Error("invalid money amount");
  const [whole, frac = ""] = text.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export const fromCents = (cents: number) => (cents / 100).toFixed(2);

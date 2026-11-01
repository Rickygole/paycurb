export const rules = [
  { id: "R00", name: "Known tool" },
  { id: "R01", name: "Currency" },
  { id: "R02", name: "Totals add up" },
  { id: "R15", name: "Matches approval" },
  { id: "R03", name: "No recurring" },
  { id: "R04", name: "Approved merchant" },
  { id: "R05", name: "Category" },
  { id: "R06", name: "Per order limit" },
  { id: "R07", name: "Daily limit" },
  { id: "R08", name: "Merchant window" },
  { id: "R09", name: "Velocity" },
  { id: "R10", name: "Quantity" },
  { id: "R11", name: "Duplicates" },
  { id: "R12", name: "Refunds, payouts" },
  { id: "R13", name: "Unlisted merchant" },
  { id: "R14", name: "Approval line" },
];

export const stopAt = (ruleId: string) => {
  const index = rules.findIndex((rule) => rule.id === ruleId);
  return index === -1 ? rules.length : index;
};

export const plain = (reason: string) => {
  const text = reason.replace(/^(Blocked|Allowed|Needs approval): /, "");
  return /^\S+\.\S/.test(text) ? text : text.charAt(0).toUpperCase() + text.slice(1);
};

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function chainHash(fields: unknown[]) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(fields)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 8);
}

export const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface LandingReport {
  headline: { attack_scenarios: number; baseline_success: number; protected_success: number; money_lost_baseline_cents: number; money_lost_protected_cents: number; includes_group_a: boolean };
  generated_at: string;
}

export function loadReport(): LandingReport | null {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "../../reports/attack-report.json"), "utf8"));
  } catch {
    return null;
  }
}

export const dollars = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

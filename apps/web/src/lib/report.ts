import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface ReportHeadline {
  attack_scenarios: number;
  protected_success: number;
  gateway: string;
}

export function readHeadline(): ReportHeadline | null {
  try {
    const report = JSON.parse(readFileSync(join(process.cwd(), "../../reports/attack-report.json"), "utf8"));
    return { attack_scenarios: report.headline.attack_scenarios, protected_success: report.headline.protected_success, gateway: report.gateway };
  } catch {
    return null;
  }
}

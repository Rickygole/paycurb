import type { Metadata } from "next";
import { AuditLog } from "@/components/audit/AuditLog";

export const metadata: Metadata = { title: "Audit Log" };

export default function AuditPage() {
  return <AuditLog />;
}

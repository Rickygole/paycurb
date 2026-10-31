import type { Metadata } from "next";
import { AuditLog } from "@/components/audit/AuditLog";

export const metadata: Metadata = { title: "Audit" };

export default function AuditPage() {
  return <AuditLog />;
}

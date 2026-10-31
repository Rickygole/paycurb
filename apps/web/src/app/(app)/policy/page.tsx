import type { Metadata } from "next";
import { PolicyEditor } from "@/components/policy/PolicyEditor";

export const metadata: Metadata = { title: "Policy" };

export default function PolicyPage() {
  return <PolicyEditor />;
}

import type { Metadata } from "next";
import { AttackResults } from "@/components/attacks/AttackResults";

export const metadata: Metadata = { title: "Attacks" };

export default function AttacksPage() {
  return <AttackResults />;
}

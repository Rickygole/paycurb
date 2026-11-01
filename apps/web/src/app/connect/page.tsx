import type { Metadata } from "next";
import { Connect } from "@/components/connect/Connect";
import { connect } from "@/components/connect/copy";

export const metadata: Metadata = { title: connect.meta.title, description: connect.meta.description };

export default function ConnectPage() {
  return <Connect />;
}

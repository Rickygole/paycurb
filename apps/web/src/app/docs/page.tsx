import type { Metadata } from "next";
import { Docs } from "@/components/docs/Docs";

export const metadata: Metadata = {
  title: "Docs",
  description: "How Paycurb decides, every policy field, approvals, the audit chain, the REST API and the MCP tools.",
};

export default function DocsPage() {
  const endpoint = `${(process.env.PROXY_URL || "http://localhost:4000").replace(/\/$/, "")}/mcp`;
  return <Docs endpoint={endpoint} />;
}

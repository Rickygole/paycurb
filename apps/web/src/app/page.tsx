import type { Metadata } from "next";
import { Landing } from "@/components/landing/Landing";
import { meta } from "@/components/landing/copy";

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
};

export default function Home() {
  return <Landing />;
}

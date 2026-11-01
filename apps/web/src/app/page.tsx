import type { Metadata } from "next";
import { Home as Landing } from "@/components/home/Home";
import { meta } from "@/components/landing/copy";

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
};

export default function Home() {
  return <Landing />;
}

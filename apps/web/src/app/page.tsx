import type { Metadata } from "next";
import { ConceptA } from "@/components/concept-a/ConceptA";
import { meta } from "@/components/landing/copy";

export const metadata: Metadata = {
  title: { absolute: meta.title },
  description: meta.description,
};

export default function Home() {
  return <ConceptA />;
}

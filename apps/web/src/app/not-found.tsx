import type { Metadata } from "next";
import Link from "next/link";
import { SystemNotice } from "@/components/system/Notice";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <SystemNotice
      code="404"
      title="This page does not exist"
      actions={
        <>
          <Link href="/feed" className="btn btn-primary">
            Go to the feed
          </Link>
          <Link href="/docs" className="btn btn-outline">
            Read the docs
          </Link>
        </>
      }
    >
      The link may be old, or the address may have a typo.
    </SystemNotice>
  );
}

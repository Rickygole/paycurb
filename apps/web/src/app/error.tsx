"use client";

import Link from "next/link";
import { useEffect } from "react";
import { SystemNotice } from "@/components/system/Notice";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    document.title = "Something went wrong | Paycurb";
  }, []);

  return (
    <SystemNotice
      code="Error"
      title="This screen hit a problem"
      actions={
        <>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/feed" className="btn btn-outline">
            Go to the feed
          </Link>
        </>
      }
    >
      Paycurb could not show this page. Your policy, orders and audit log live on the server, so trying again is safe.{error.digest ? ` Reference ${error.digest}.` : ""}
    </SystemNotice>
  );
}

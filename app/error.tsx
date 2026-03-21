"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error-report";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      source: "render",
      severity: "fatal",
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      metadata: {
        boundary: "app/error"
      }
    });
  }, [error]);

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl glass-card p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Application Error</p>
        <h1 className="mt-3 font-headline text-5xl tracking-[-0.03em] text-[var(--foreground)]">Something broke on this page.</h1>
        <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
          The error was logged for the admin dashboard. You can retry the page now.
        </p>
        <Button className="mt-6" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </main>
  );
}

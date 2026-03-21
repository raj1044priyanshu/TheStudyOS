"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-error-report";

export default function GlobalError({
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
        boundary: "app/global-error"
      }
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[color:var(--background)] px-6 py-12">
        <main className="mx-auto max-w-3xl glass-card p-8">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Global Error</p>
          <h1 className="mt-3 font-headline text-5xl tracking-[-0.03em] text-[var(--foreground)]">StudyOS hit a critical error.</h1>
          <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">
            The failure was reported to the admin dashboard. Reset the app to try again.
          </p>
          <Button className="mt-6" onClick={() => reset()}>
            Reset application
          </Button>
        </main>
      </body>
    </html>
  );
}

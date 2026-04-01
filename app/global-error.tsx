"use client";

import { useEffect } from "react";
import { CompanionPanel } from "@/components/companion/StudyCompanion";
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
          <CompanionPanel
            pose="sad-but-supportive"
            eyebrow="Global Error"
            title="StudyOS hit a critical error."
            description="The failure was reported to the admin dashboard. Reset the app to try again."
            compact
          />
          <Button className="mt-6" onClick={() => reset()}>
            Reset application
          </Button>
        </main>
      </body>
    </html>
  );
}

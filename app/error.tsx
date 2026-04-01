"use client";

import { useEffect } from "react";
import { CompanionPanel } from "@/components/companion/StudyCompanion";
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
        <CompanionPanel
          pose="sad-but-supportive"
          eyebrow="Application Error"
          title="Something broke on this page."
          description="The error was logged for the admin dashboard. You can retry the page now."
          compact
        />
        <Button className="mt-6" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </main>
  );
}

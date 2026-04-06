"use client";

import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

export function HubPanelFallback({ text }: { text: string }) {
  return (
    <div className="surface-card rounded-[24px] p-5">
      <LoadingSpinner text={text} />
    </div>
  );
}

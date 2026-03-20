"use client";

import { SUBJECT_COLOR_VALUES } from "@/lib/constants";

export function ConceptFlowNode({ data }: { data: { label: string; subject: string; confidence: number } }) {
  const color = SUBJECT_COLOR_VALUES[data.subject] ?? SUBJECT_COLOR_VALUES.Other;
  const width = Math.max(120, Math.min(220, 120 + data.confidence));
  return (
    <div
      className={`rounded-full border px-5 py-4 text-center shadow-[var(--glass-shadow-deep)] ${data.confidence < 40 ? "animate-pulse" : ""}`}
      style={{
        width,
        borderColor: `${color}55`,
        backgroundColor: `${color}18`,
        boxShadow: data.confidence > 80 ? `0 0 24px ${color}33` : undefined
      }}
    >
      <p className="text-sm font-semibold text-[var(--foreground)]">{data.label}</p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{data.subject}</p>
    </div>
  );
}

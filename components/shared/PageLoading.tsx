"use client";

import { StudyCompanion } from "@/components/companion/StudyCompanion";

export function PageLoading({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <StudyCompanion pose="sparkle" size={112} compact />
        <div className="min-w-[220px] flex-1 space-y-3">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[color:var(--surface-low)]" />
          <div className="h-12 w-64 animate-pulse rounded-[20px] bg-[color:var(--surface-low)]" />
          <div className="h-5 w-full max-w-2xl animate-pulse rounded-full bg-[color:var(--surface-low)]" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, index) => (
          <div key={index} className="glass-card h-48 animate-pulse rounded-[28px] bg-[color:var(--surface-low)]" />
        ))}
      </div>
    </div>
  );
}

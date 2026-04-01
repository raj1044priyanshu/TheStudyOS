"use client";

import Link from "next/link";
import { IconArrowUpRight, IconSparkles } from "@tabler/icons-react";
import { CompanionBadge } from "@/components/companion/StudyCompanion";
import { Button } from "@/components/ui/button";
import type { NextStepSuggestion } from "@/types";

interface Props {
  suggestions: NextStepSuggestion[];
  onAction?: (action: NonNullable<NextStepSuggestion["action"]>) => void | Promise<void>;
}

export function NextStepCard({ suggestions, onAction }: Props) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="glass-card rounded-[28px] border-l-4 border-l-[color:var(--brand-500)] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tertiary-foreground)]">What to do next</p>
        <CompanionBadge pose="sparkle" size={50} />
      </div>
      <div className="mt-4 grid gap-3">
        {suggestions.slice(0, 2).map((suggestion) => (
          <div key={`${suggestion.title}-${suggestion.href ?? suggestion.action ?? "static"}`} className="surface-card rounded-[22px] p-4">
            <div className="flex items-center gap-2">
              <span className="surface-icon inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--brand-500)]">
                <IconSparkles className="h-4 w-4" />
              </span>
              <p className="font-medium text-[var(--foreground)]">{suggestion.title}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{suggestion.description}</p>
            <div className="mt-4">
              {suggestion.href ? (
                <Link href={suggestion.href}>
                  <Button size="sm" className="gap-2">
                    Open
                    <IconArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (() => {
                  const action = suggestion.action;
                  if (!action || !onAction) {
                    return null;
                  }

                  return (
                    <Button size="sm" onClick={() => void onAction(action)} className="gap-2">
                      Do this
                      <IconArrowUpRight className="h-4 w-4" />
                    </Button>
                  );
                })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

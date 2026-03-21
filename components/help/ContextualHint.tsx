"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import type { ContextualHintId } from "@/types";

interface Props {
  id: ContextualHintId;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function ContextualHint({ id, message, ctaLabel, ctaHref }: Props) {
  const storageKey = useMemo(() => `studyos_hint_dismissed_${id}`, [id]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(storageKey) === "true") {
      return;
    }
    setVisible(true);
    const timeout = window.setTimeout(() => setVisible(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [storageKey]);

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-[5.75rem] right-4 z-[1000] w-[calc(100vw-2rem)] max-w-[22rem] rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] p-4 shadow-[var(--glass-shadow-deep)] backdrop-blur-xl md:bottom-6 md:right-6"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="surface-icon inline-flex h-10 w-10 items-center justify-center rounded-[16px] text-[#7B6CF6]">
          <IconSparkles className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Quick reminder</p>
          <p className="mt-1.5 text-sm leading-6 text-[var(--muted-foreground)]">{message}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {ctaHref && ctaLabel ? (
              <Link
                href={ctaHref}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-[color:var(--primary)] px-4 py-2 text-sm font-medium text-[color:var(--primary-foreground)] shadow-[var(--primary-shadow)] transition hover:-translate-y-px hover:shadow-[var(--primary-shadow-hover)]"
              >
                {ctaLabel}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => {
                window.localStorage.setItem(storageKey, "true");
                setVisible(false);
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-full px-3 py-2 text-sm font-medium text-[var(--muted-foreground)] transition hover:bg-[color:var(--ghost-hover)] hover:text-[var(--foreground)]"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(storageKey, "true");
            setVisible(false);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted-foreground)] transition hover:bg-[color:var(--ghost-hover)] hover:text-[var(--foreground)]"
          aria-label="Dismiss hint"
        >
          <IconX className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

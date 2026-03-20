"use client";

import { useEffect, useId, useRef } from "react";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-4xl"
} as const;

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: keyof typeof sizeClasses;
  bodyClassName?: string;
  className?: string;
  closeButtonTourId?: string;
  dialogTourId?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  bodyClassName,
  className,
  closeButtonTourId,
  dialogTourId
}: DialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previousActiveElement?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[color:var(--overlay-scrim)] backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          data-tour-id={dialogTourId}
          className={cn(
            "glass-modal animate-fade-up-soft flex max-h-[min(92vh,960px)] w-full flex-col overflow-hidden",
            sizeClasses[size],
            className
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] px-5 py-4 backdrop-blur-xl sm:px-6">
            <div className="min-w-0">
              <h3 id={titleId} className="font-headline text-[1.95rem] tracking-[-0.03em] text-[var(--foreground)]">
                {title}
              </h3>
              {description ? (
                <p id={descriptionId} className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              data-tour-id={closeButtonTourId}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[var(--foreground)]"
              aria-label="Close dialog"
              title="Close"
            >
              <IconX className="h-4 w-4" />
            </button>
          </div>

          <div className={cn("min-h-0 overflow-y-auto px-5 py-4 sm:px-6", bodyClassName)}>{children}</div>

          {footer ? (
            <div className="border-t border-[color:var(--panel-border)] bg-[color:var(--surface-low)] px-5 py-4 sm:px-6">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

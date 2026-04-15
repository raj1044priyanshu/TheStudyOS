"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-styles";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/features", label: "Features" },
  { href: "/resources", label: "Resources" },
  { href: "/blog", label: "Blog" },
  { href: "/study-guides", label: "Study Guides" }
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PublicSiteHeader({ trackingLocation = "public-header" }: { trackingLocation?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTitleId = useId();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }

      if (event.key !== "Tab" || !menuRef.current) {
        return;
      }

      const focusable = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable.length) {
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
  }, [menuOpen]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-[color:var(--page-bg)]/80 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-sm sm:px-6 sm:pb-6 sm:pt-4">
        <div className="glass-nav mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-[24px] border border-[color:var(--panel-border)] px-3 py-3 sm:px-4 lg:px-5">
          <Logo compact className="min-w-0" href="/#top" />

          <nav className="hidden items-center gap-5 lg:flex">
            {NAV_ITEMS.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm transition",
                    active ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="hidden h-10 w-10 rounded-full sm:inline-flex" />
            <TrackedLink
              href="/login"
              className={cn(buttonVariants({ size: "sm" }), "px-4")}
              tracking={{
                event: "cta_click",
                params: {
                  location: trackingLocation,
                  label: "Sign in",
                  destination: "/login"
                }
              }}
            >
              Sign in
            </TrackedLink>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full p-0 lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="public-site-menu"
              aria-label="Open site navigation"
              onClick={() => setMenuOpen(true)}
            >
              <IconMenu2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-[color:var(--overlay-scrim)] backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close site navigation"
          />

          <div className="relative px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 sm:pt-4">
            <div
              id="public-site-menu"
              ref={menuRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={menuTitleId}
              className="glass-modal mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-[28px]"
            >
              <div className="flex items-start justify-between gap-4 border-b border-[color:var(--panel-border)] px-4 py-4 sm:px-5">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tertiary-foreground)]">Navigation</p>
                  <h2 id={menuTitleId} className="mt-2 font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">
                    Explore StudyOS
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                    Open feature pages, resources, blog posts, and study guides without losing your place.
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[var(--foreground)]"
                  aria-label="Close menu"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
                <nav className="grid gap-3">
                  {NAV_ITEMS.map((item) => {
                    const active = isActivePath(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "surface-card flex items-center justify-between rounded-[22px] px-4 py-4 text-sm transition",
                          active && "border-[color:var(--secondary-button-border)] bg-[color:var(--nav-active-bg)] text-[var(--foreground)]"
                        )}
                        onClick={() => setMenuOpen(false)}
                      >
                        <span className="font-medium">{item.label}</span>
                        <span className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Open</span>
                      </Link>
                    );
                  })}
                </nav>

                <div className="flex flex-wrap items-center gap-3">
                  <ThemeToggle className="h-11 w-11 rounded-full sm:hidden" />
                  <TrackedLink
                    href="/login"
                    className={cn(buttonVariants({ size: "sm" }), "px-4")}
                    tracking={{
                      event: "cta_click",
                      params: {
                        location: "public-menu",
                        label: "Sign in",
                        destination: "/login"
                      }
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign in
                  </TrackedLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  IconChevronRight,
  IconLogout,
  IconMenu2,
  IconMoonStars
} from "@tabler/icons-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { floatingPanelClassName, floatingPanelScrollAreaClassName } from "@/components/ui/floating-panel";
import { MOBILE_MORE_NAV_ITEMS, MOBILE_PRIMARY_NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const isNoteViewer = pathname.startsWith("/notes/");
  const isMoreActive = MOBILE_MORE_NAV_ITEMS.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (isNoteViewer) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-[rgba(28,27,41,0.18)] backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-label="Close more menu"
            />
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              data-tour-id="mobile-more-sheet"
              className={cn(
                floatingPanelClassName,
                "fixed inset-x-3 bottom-24 z-50 flex max-h-[calc(100dvh-7rem)] flex-col p-4 md:hidden"
              )}
            >
              <div className={cn(floatingPanelScrollAreaClassName, "space-y-4")}>
                <div className="surface-card rounded-[18px] p-3">
                  <Avatar src={session?.user?.image} alt={session?.user?.name ?? "Student"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">{session?.user?.name ?? "Student"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Your calm study workspace</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <NotificationBell align="left" />
                    <ThemeToggle className="h-11 w-11" />
                  </div>
                </div>

                <div className="relative">
                  <GlobalSearch className="relative" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {MOBILE_MORE_NAV_ITEMS.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        data-tour-id={item.tourId}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "glass-card flex items-center justify-between gap-3 px-4 py-3 transition",
                          active && "border-[color:var(--secondary-button-border)] bg-[color:var(--secondary-button-bg)]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="surface-icon inline-flex h-10 w-10 items-center justify-center rounded-full">
                            <item.icon className="h-[18px] w-[18px]" />
                          </span>
                          <span className="text-sm font-medium text-[var(--foreground)]">{item.label}</span>
                        </div>
                        <IconChevronRight className="h-4 w-4 text-[var(--tertiary-foreground)]" />
                      </Link>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="glass-card flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="surface-icon-muted inline-flex h-10 w-10 items-center justify-center rounded-full">
                      <IconLogout className="h-[18px] w-[18px]" />
                    </span>
                    <span className="text-sm font-medium text-[var(--foreground)]">Logout</span>
                  </div>
                  <IconMoonStars className="h-4 w-4 text-[var(--tertiary-foreground)]" />
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <nav className="glass-nav fixed bottom-3 left-3 right-3 z-40 rounded-[24px] border border-[color:var(--panel-border)] px-2 py-2 shadow-[0_12px_32px_rgba(123,108,246,0.14)] md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                data-tour-id={item.tourId}
                className={cn(
                  "rounded-[18px] px-2 py-2 text-center transition",
                  active ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[var(--primary-shadow)]" : "text-[var(--muted-foreground)]"
                )}
              >
                <item.icon className="mx-auto h-[18px] w-[18px]" />
                <span className="mt-1 block text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={cn(
              "rounded-[18px] px-2 py-2 text-center transition",
              open || isMoreActive ? "bg-[color:var(--primary)] text-[color:var(--primary-foreground)] shadow-[var(--primary-shadow)]" : "text-[var(--muted-foreground)]"
            )}
            data-tour-id="nav-more"
            aria-expanded={open}
            aria-label="Open more menu"
          >
            <IconMenu2 className="mx-auto h-[18px] w-[18px]" />
            <span className="mt-1 block text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

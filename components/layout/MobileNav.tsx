"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { IconChevronRight, IconMenu2, IconX } from "@tabler/icons-react";
import { MOBILE_MORE_NAV_ITEMS, MOBILE_PRIMARY_NAV_ITEMS, getHubNavKey } from "@/lib/hubs";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();
  const activeKey = getHubNavKey(pathname);
  const [moreOpen, setMoreOpen] = useState(false);

  const moreActive = useMemo(
    () =>
      MOBILE_MORE_NAV_ITEMS.some((item) => pathname.startsWith(item.href)) ||
      activeKey === "revise" ||
      activeKey === "track" ||
      activeKey === "profile",
    [activeKey, pathname]
  );

  return (
    <>
      <nav className="glass-nav fixed bottom-0 left-0 right-0 z-40 border-t border-[color:var(--panel-border)] px-2 pb-[max(env(safe-area-inset-bottom),0px)] pt-1 shadow-[0_-12px_32px_rgba(123,108,246,0.1)] md:hidden">
        <div className="grid h-[4.3rem] grid-cols-5 gap-1">
          {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
            const active = activeKey === item.key;
            const label = item.key === "dashboard" ? "Home" : item.label;
            return (
              <Link
                key={item.key}
                href={item.href}
                prefetch
                className={cn(
                  "flex flex-col items-center justify-center rounded-[18px] text-center transition",
                  active ? "text-[#7B6CF6]" : "text-[var(--tertiary-foreground)]"
                )}
              >
                <item.icon className={cn("h-[22px] w-[22px]", active && "drop-shadow-[0_6px_12px_rgba(123,108,246,0.22)]")} />
                <span className="mt-1 text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center rounded-[18px] text-center transition",
              moreActive ? "text-[#7B6CF6]" : "text-[var(--tertiary-foreground)]"
            )}
            aria-expanded={moreOpen}
            aria-label="Open more navigation"
          >
            <IconMenu2 className={cn("h-[22px] w-[22px]", moreActive && "drop-shadow-[0_6px_12px_rgba(123,108,246,0.22)]")} />
            <span className="mt-1 text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {moreOpen ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-[color:var(--overlay-scrim)] backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
              aria-label="Close more navigation"
            />
            <motion.aside
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[30px] border border-b-0 border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] px-4 pb-[calc(max(env(safe-area-inset-bottom),0px)+1rem)] pt-4 shadow-[var(--glass-shadow-deep)] backdrop-blur-2xl md:hidden"
            >
              <div className="mx-auto max-w-md">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">More</p>
                    <h3 className="mt-2 font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">Quick destinations</h3>
                    <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                      Open your profile, revision tools, progress views, and group study from here.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    className="surface-icon-muted inline-flex h-11 w-11 items-center justify-center rounded-[18px] transition hover:text-[var(--foreground)]"
                    aria-label="Close more navigation"
                  >
                    <IconX className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3">
                  {MOBILE_MORE_NAV_ITEMS.map((item) => {
                    const active = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => setMoreOpen(false)}
                        className={cn(
                          "surface-card flex items-center justify-between gap-3 rounded-[22px] px-4 py-4 transition",
                          active && "border-[color:var(--secondary-button-border)] bg-[color:var(--nav-active-bg)]"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-[16px]", active ? "surface-icon" : "surface-icon-muted")}>
                            <item.icon className="h-[18px] w-[18px]" />
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--foreground)]">{item.label}</p>
                            <p className="text-xs text-[var(--muted-foreground)]">
                              {item.key === "profile"
                                ? "Settings, level, and account details"
                                : item.key === "study-room"
                                  ? "Group study, live timer, chat, and whiteboard"
                                  : item.key === "revise"
                                    ? "Revision queue, formulas, and mind maps"
                                    : "Progress, streaks, and weak-topic review"}
                            </p>
                          </div>
                        </div>
                        <IconChevronRight className="h-4 w-4 text-[var(--tertiary-foreground)]" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}

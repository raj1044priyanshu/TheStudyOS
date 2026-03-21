"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { HubLayoutProps, HubPhase, HubToolId } from "@/types";
import { cn } from "@/lib/utils";
import { normalizeHubTool } from "@/lib/hubs";

function getActiveTabId(phase: HubPhase, defaultTab: HubToolId | undefined, tool: string | null) {
  if (!defaultTab || phase === "track") {
    return defaultTab;
  }

  return normalizeHubTool(phase as Exclude<HubPhase, "track">, tool);
}

export function HubLayout({ phase, title, subtitle, stats, tabs = [], defaultTab, children }: HubLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getActiveTabId(phase, defaultTab, searchParams.get("tool"));
  const activePanel = useMemo(() => tabs.find((tab) => tab.id === activeTab) ?? tabs[0], [activeTab, tabs]);

  function switchTab(nextTab: HubToolId) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tool", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section id={`hub-header-${phase}`} className="glass-card rounded-[26px] p-5 sm:p-6 lg:p-7">
        <div className="max-w-4xl">
          <h1 className="font-headline text-[clamp(2rem,5vw,3rem)] tracking-[-0.05em] text-[var(--foreground)]">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base sm:leading-7">{subtitle}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="surface-card inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-[var(--foreground)]">
                <Icon className="h-4 w-4 text-[#7B6CF6]" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {tabs.length ? (
        <>
          <div id={`hub-tabs-${phase}`} className="glass-card rounded-[24px] px-3 py-3 sm:px-4 md:px-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {tabs.map((tab) => {
                const active = tab.id === activeTab;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    id={`hub-tab-${phase}-${tab.id}`}
                    type="button"
                    onClick={() => switchTab(tab.id)}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-150 sm:px-5",
                      active
                        ? "bg-[#7B6CF6] text-white shadow-[0_4px_12px_rgba(123,108,246,0.3)]"
                        : "bg-[rgba(123,108,246,0.08)] text-[var(--muted-foreground)] hover:bg-[rgba(123,108,246,0.15)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="glass-card min-h-[380px] rounded-[26px] p-4 sm:p-5 md:p-6">
            <AnimatePresence mode="wait">
              {activePanel ? (
                <motion.div
                  id={`hub-panel-${phase}-${activePanel.id}`}
                  key={activePanel.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {activePanel.component}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <div className="glass-card rounded-[30px] p-4 md:p-6">{children}</div>
      )}
    </div>
  );
}

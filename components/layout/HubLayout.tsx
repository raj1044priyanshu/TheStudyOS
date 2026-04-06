"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { StudyCompanion } from "@/components/companion/StudyCompanion";
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-4xl">
            <h1 className="font-headline text-[clamp(2rem,5vw,3rem)] tracking-[-0.05em] text-[var(--foreground)]">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted-foreground)] sm:text-base sm:leading-7">{subtitle}</p>
          </div>
          <div className="self-start rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--hero-panel)] p-2 shadow-[var(--panel-shadow)]">
            <StudyCompanion
              pose={phase === "plan" ? "thinking" : phase === "study" ? "wave" : phase === "test" ? "sparkle" : phase === "revise" ? "cheer" : "sleepy-focus"}
              size={120}
              compact
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="surface-card inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm text-[var(--foreground)]">
                <Icon className="h-4 w-4 text-[color:var(--brand-500)]" />
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
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-150 sm:px-5",
                      active
                        ? "bg-[color:var(--brand-500)] text-[color:var(--primary-foreground)] shadow-[var(--primary-shadow)]"
                        : "bg-[color:var(--brand-soft)] text-[var(--muted-foreground)] hover:bg-[color:var(--secondary-button-hover)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {activePanel ? (
              <div className="surface-card mt-3 rounded-[20px] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
                  You are here
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[color:var(--brand-soft)] px-3 py-1 text-xs font-medium text-[color:var(--brand-700)]">
                    {title}
                  </span>
                  <span className="text-sm font-semibold text-[var(--foreground)]">{activePanel.label}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Tool {tabs.findIndex((tab) => tab.id === activePanel.id) + 1} of {tabs.length}
                  </span>
                </div>
                {activePanel.description ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{activePanel.description}</p>
                ) : null}
              </div>
            ) : null}
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

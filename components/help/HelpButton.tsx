"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { IconChevronRight, IconHelpCircle, IconRefresh, IconRoute, IconSchool } from "@tabler/icons-react";
import { FEATURE_GUIDES, HELP_GOAL_ACTIONS } from "@/lib/study-flow";
import { CompanionBadge } from "@/components/companion/StudyCompanion";
import { Button } from "@/components/ui/button";
import { clearAllTourStorage, getTourPageFromPathname, queueForcedTour } from "@/lib/tour";
import { StudyWorkflowModal } from "@/components/help/StudyWorkflowModal";
import { cn } from "@/lib/utils";
import type { StudyStyle } from "@/types";

interface Props {
  studyStyle?: StudyStyle | "";
  className?: string;
}

export function HelpButton({ studyStyle = "mixed", className }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const currentPageTour = useMemo(() => getTourPageFromPathname(pathname), [pathname]);

  useEffect(() => {
    if (!open && workflowOpen) {
      setWorkflowOpen(false);
    }
  }, [open, workflowOpen]);

  function restartTour() {
    clearAllTourStorage();
    queueForcedTour("dashboard", "full");
    window.dispatchEvent(new CustomEvent("studyos:tour-restart"));
    setOpen(false);
  }

  function tourThisPage() {
    if (!currentPageTour) {
      return;
    }
    queueForcedTour(currentPageTour);
    window.dispatchEvent(new CustomEvent("studyos:tour-page", { detail: { page: currentPageTour } }));
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-12 w-12 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[var(--foreground)]",
          className
        )}
        aria-label="Open help"
        title="Help"
      >
        <IconHelpCircle className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-[rgba(15,15,35,0.28)] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (workflowOpen) {
                  setWorkflowOpen(false);
                  return;
                }

                setOpen(false);
              }}
              aria-label="Close help"
            />
            <motion.aside
              initial={{ x: 340, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 340, opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed right-3 top-3 z-50 h-[calc(100vh-1.5rem)] w-[min(92vw,360px)] overflow-hidden rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] shadow-[var(--glass-shadow-deep)] backdrop-blur-xl"
            >
              <div className="flex h-full flex-col">
                <div className="border-b border-[color:var(--panel-border)] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--tertiary-foreground)]">Help Centre</p>
                      <h3 className="mt-2 font-headline text-4xl text-[var(--foreground)]">Need a guide?</h3>
                    </div>
                    <CompanionBadge pose="thinking" size={56} className="shrink-0" />
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Guide me</p>
                    <Button variant="outline" className="w-full justify-between" onClick={restartTour}>
                      <span className="inline-flex items-center gap-2">
                        <IconRefresh className="h-4 w-4" />
                        Restart full tour
                      </span>
                      <IconChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" className="w-full justify-between" onClick={tourThisPage} disabled={!currentPageTour}>
                      <span className="inline-flex items-center gap-2">
                        <IconRoute className="h-4 w-4" />
                        Tour this page
                      </span>
                      <IconChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => {
                        setExpanded(null);
                        setWorkflowOpen(true);
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <IconSchool className="h-4 w-4" />
                        View Study Workflow
                      </span>
                      <IconChevronRight className="h-4 w-4" />
                    </Button>
                  </section>

                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Quick start by goal</p>
                    {HELP_GOAL_ACTIONS.map((action) => (
                      <div key={action.key} className="surface-card rounded-[22px] p-4">
                        <p className="font-medium text-[var(--foreground)]">{action.title}</p>
                        <div className="mt-3 space-y-2">
                          {action.steps.map((step, index) => (
                            <p key={step} className="text-sm leading-6 text-[var(--muted-foreground)]">
                              {index + 1}. {step}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>

                  <section className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Feature guide</p>
                    {FEATURE_GUIDES.map((guide) => {
                      const openItem = expanded === guide.name;
                      return (
                        <div key={guide.name} className="overflow-hidden rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)]">
                          <button
                            type="button"
                            onClick={() => setExpanded(openItem ? null : guide.name)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                          >
                            <div className="flex items-center gap-3">
                              <span className="surface-icon inline-flex h-10 w-10 items-center justify-center rounded-full">
                                <guide.icon className="h-4 w-4" />
                              </span>
                              <span className="font-medium text-[var(--foreground)]">{guide.name}</span>
                            </div>
                            <IconChevronRight className={`h-4 w-4 transition ${openItem ? "rotate-90" : ""}`} />
                          </button>
                          {openItem ? (
                            <div className="space-y-3 border-t border-[color:var(--panel-border)] px-4 py-4">
                              <p className="text-sm leading-6 text-[var(--muted-foreground)]">{guide.description}</p>
                              <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                                <span className="font-medium text-[var(--foreground)]">When to use this:</span> {guide.whenToUse}
                              </p>
                              <a href={guide.href} className="inline-flex text-sm font-medium text-[color:var(--brand-500)]">
                                Open feature
                              </a>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </section>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <StudyWorkflowModal open={workflowOpen} onClose={() => setWorkflowOpen(false)} studyStyle={studyStyle} />
    </>
  );
}

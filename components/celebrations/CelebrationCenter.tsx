"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconArrowRight, IconFlame, IconSparkles, IconTrophy, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StudyCompanion } from "@/components/companion/StudyCompanion";
import type { CelebrationItem } from "@/lib/client-celebrations";

const CELEBRATION_EVENT = "studyos:celebration-enqueue";
const CELEBRATION_STATE_EVENT = "studyos:celebration-state";

function ordinalCardColor(kind: CelebrationItem["kind"]) {
  if (kind === "streak-broken") return "var(--danger-soft)";
  if (kind === "level-up") return "var(--warning-soft)";
  if (kind === "streak-progress") return "var(--brand-soft)";
  return "var(--accent-soft)";
}

function ordinalCardText(kind: CelebrationItem["kind"]) {
  if (kind === "streak-broken") return "var(--danger-strong)";
  if (kind === "level-up") return "var(--warning-strong)";
  if (kind === "streak-progress") return "var(--brand-700)";
  return "var(--accent-600)";
}

function useCelebrationQueue() {
  const reducedMotion = useReducedMotion();
  const seenRef = useRef<Set<string>>(new Set());
  const [queue, setQueue] = useState<CelebrationItem[]>([]);
  const [active, setActive] = useState<CelebrationItem | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.sessionStorage.getItem("studyos:celebration-seen");
      if (raw) {
        seenRef.current = new Set(JSON.parse(raw) as string[]);
      }
    } catch {
      window.sessionStorage.removeItem("studyos:celebration-seen");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const busy = Boolean(active || queue.length > 0);
    window.__studyosCelebrationBusy = busy;
    window.dispatchEvent(new CustomEvent(CELEBRATION_STATE_EVENT, { detail: { busy } }));
  }, [active, queue.length]);

  useEffect(() => {
    function onEnqueue(event: Event) {
      const detail = (event as CustomEvent<CelebrationItem[]>).detail ?? [];
      if (!Array.isArray(detail) || detail.length === 0) {
        return;
      }

      setQueue((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        if (active) {
          existingIds.add(active.id);
        }

        const nextItems = detail.filter((item) => !existingIds.has(item.id) && !seenRef.current.has(item.id));
        if (!nextItems.length) {
          return previous;
        }

        return [...previous, ...nextItems].sort((left, right) => right.priority - left.priority);
      });
    }

    window.addEventListener(CELEBRATION_EVENT, onEnqueue as EventListener);
    return () => window.removeEventListener(CELEBRATION_EVENT, onEnqueue as EventListener);
  }, [active]);

  useEffect(() => {
    if (active || queue.length === 0) {
      return;
    }

    const [next, ...rest] = queue;
    setActive(next);
    setQueue(rest);
  }, [active, queue]);

  async function dismissCurrent() {
    if (!active) {
      return;
    }

    seenRef.current.add(active.id);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("studyos:celebration-seen", JSON.stringify(Array.from(seenRef.current)));
    }

    if (active.requiresStreakAlertAck) {
      await fetch("/api/streak/alert", { method: "PATCH" }).catch(() => null);
    }

    setActive(null);
  }

  const motionProps = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    : {
        initial: { opacity: 0, y: 20, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 14, scale: 0.98 }
      };

  return {
    active,
    dismissCurrent,
    motionProps
  };
}

function CelebrationChip({ icon, label, kind }: { icon: React.ReactNode; label: string; kind: CelebrationItem["kind"] }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]"
      style={{
        backgroundColor: ordinalCardColor(kind),
        color: ordinalCardText(kind)
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function CelebrationBody({ item }: { item: CelebrationItem }) {
  if (item.kind === "achievement-bundle" && item.achievements?.length) {
    return (
      <div className="grid gap-3">
        {item.achievements.slice(0, 4).map((achievement) => (
          <div
            key={`${achievement.type ?? achievement.title}`}
            className="rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[var(--foreground)]">{achievement.title ?? "Achievement"}</p>
              {typeof achievement.xp === "number" ? (
                <span className="rounded-full bg-[color:var(--brand-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--brand-700)]">
                  +{achievement.xp} XP
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{achievement.description ?? "A new milestone joined your shelf."}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] p-4">
      <p className="text-sm leading-7 text-[var(--muted-foreground)]">{item.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.level ? <CelebrationChip icon={<IconSparkles className="h-3.5 w-3.5" />} label={`Lv ${item.level.to}`} kind={item.kind} /> : null}
        {item.streak?.milestone ? (
          <CelebrationChip icon={<IconFlame className="h-3.5 w-3.5" />} label={`${item.streak.milestone} day streak`} kind={item.kind} />
        ) : item.streak?.current ? (
          <CelebrationChip icon={<IconFlame className="h-3.5 w-3.5" />} label={`${item.streak.current} day streak`} kind={item.kind} />
        ) : null}
        {typeof item.xpGained === "number" && item.xpGained > 0 ? (
          <CelebrationChip icon={<IconTrophy className="h-3.5 w-3.5" />} label={`+${item.xpGained} XP`} kind={item.kind} />
        ) : null}
      </div>
    </div>
  );
}

export function CelebrationCenter() {
  const { active, dismissCurrent, motionProps } = useCelebrationQueue();

  const actionHref = useMemo(() => {
    if (!active) {
      return null;
    }

    if (active.kind === "streak-progress") {
      return "/dashboard/track";
    }

    if (active.kind === "achievement-bundle" || active.kind === "level-up") {
      return "/dashboard/profile";
    }

    return "/dashboard";
  }, [active]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div className="fixed inset-0 z-[120] flex items-center justify-center px-4 py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.button
            type="button"
            className="absolute inset-0 bg-[color:var(--overlay-scrim)] backdrop-blur-md"
            onClick={() => void dismissCurrent()}
            aria-label="Dismiss celebration"
          />
          <motion.div
            {...motionProps}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="relative z-10 w-full max-w-[760px] overflow-hidden rounded-[36px] border border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] p-6 shadow-[var(--glass-shadow-deep)] sm:p-8"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--brand-300)_36%,transparent),transparent_72%)]" />

            <button
              type="button"
              onClick={() => void dismissCurrent()}
              className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--control-border)] bg-[color:var(--control-bg)] text-[var(--muted-foreground)] shadow-[var(--control-shadow)] transition hover:bg-[color:var(--control-hover-bg)] hover:text-[var(--foreground)]"
              aria-label="Close celebration"
            >
              <IconX className="h-4 w-4" />
            </button>

            <div className="relative grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-center">
              <div className="flex justify-center md:justify-start">
                <StudyCompanion pose={active.pose} size={220} />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand-700)]">Celebration Queue</p>
                <h2 className="mt-3 font-headline text-[clamp(2.2rem,6vw,4rem)] leading-[0.95] tracking-[-0.05em] text-[var(--foreground)]">
                  {active.title}
                </h2>
                <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted-foreground)]">{active.description}</p>

                <div className="mt-5">
                  <CelebrationBody item={active} />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => void dismissCurrent()} className="gap-2">
                    Keep going
                    <IconArrowRight className="h-4 w-4" />
                  </Button>
                  {actionHref ? (
                    <Link href={actionHref}>
                      <Button variant="outline">Open related page</Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

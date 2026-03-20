"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconArrowRight, IconCalendarWeek, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { triggerAchievementCheck } from "@/lib/client-achievements";

interface BriefTask {
  subject: string;
  topic: string;
  duration: number;
}

interface BriefExam {
  _id?: string;
  subject: string;
  examName?: string;
  daysUntil: number;
}

interface WeakestTopic {
  topic: string;
  subject: string;
  avgScore?: number;
}

interface BriefPayload {
  greeting: string;
  profile: { firstName: string };
  dateLabel: string;
  quote: { text: string; author: string };
  todayPlan: BriefTask[];
  exams: BriefExam[];
  yesterdayProgress: { quizScore: number; studyMinutes: number } | null;
  weakestTopic: WeakestTopic | null;
  revisionDue: number;
  studyForecast: "light" | "moderate" | "heavy";
  isNewUser: boolean;
}

const STORAGE_KEY = "studyos_brief_date";

export function DailyBrief() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const [payload, setPayload] = useState<BriefPayload | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    const lastSeen = window.localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== today) {
      setVisible(true);
    }
    void triggerAchievementCheck("daily_login");
  }, [today]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    async function load() {
      const response = await fetch("/api/brief", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as BriefPayload | null;
      if (!cancelled && response.ok && data) {
        setPayload(data);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  function dismiss() {
    setClosing(true);
    window.localStorage.setItem(STORAGE_KEY, today);
    window.setTimeout(() => {
      setVisible(false);
      setClosing(false);
    }, 220);
  }

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-[88] flex items-center justify-center bg-[rgba(20,24,42,0.34)] p-4 backdrop-blur-md transition-opacity",
        closing && "opacity-0"
      )}
    >
      <div className="glass-modal w-full max-w-[680px] rounded-[32px] p-6 shadow-[var(--glass-shadow-deep)] sm:p-10">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="font-headline text-[2.2rem] leading-none tracking-[-0.04em] text-[var(--foreground)] sm:text-[2.5rem]">
              {payload ? `${payload.greeting}, ${payload.profile.firstName}` : "Loading your study brief..."}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">{payload?.dateLabel ?? "Preparing today's view"}</p>
          </div>

          <div className="rounded-[26px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] px-5 py-4 text-center">
            <p className="font-headline text-[1.35rem] italic leading-7 text-[var(--foreground)]">
              {payload?.quote.text ?? "Building your first study brief..."}
            </p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">— {payload?.quote.author ?? "StudyOS"}</p>
          </div>

          {payload?.isNewUser ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "Generate a note", href: "/notes", desc: "Start with one clear topic." },
                { title: "Try a quiz", href: "/quiz", desc: "Check what you already know." },
                { title: "Build a plan", href: "/planner", desc: "Map your next few days." }
              ].map((item) => (
                <Link key={item.title} href={item.href} className="surface-card rounded-[22px] p-4 transition hover:-translate-y-0.5">
                  <p className="text-base font-semibold text-[var(--foreground)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.desc}</p>
                </Link>
              ))}
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <IconCalendarWeek className="h-4 w-4 text-[#7B6CF6]" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">Today's Study Plan</p>
                </div>
                {payload?.todayPlan?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {payload.todayPlan.map((task, index) => {
                      const color = SUBJECT_COLOR_VALUES[task.subject] ?? SUBJECT_COLOR_VALUES.Other;
                      return (
                        <span
                          key={`${task.subject}-${task.topic}-${index}`}
                          className="rounded-full border px-3 py-2 text-xs font-medium"
                          style={{ backgroundColor: `${color}18`, borderColor: `${color}55`, color }}
                        >
                          {task.subject} • {task.duration}m
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="surface-card flex items-center justify-between gap-3 rounded-[22px] p-4">
                    <p className="text-sm text-[var(--muted-foreground)]">No study plan for today. Want me to create one?</p>
                    <Link href="/planner" className="text-sm font-medium text-[#7B6CF6]">
                      Open Planner
                    </Link>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <p className="text-sm font-semibold text-[var(--foreground)]">Upcoming Exams</p>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {(payload?.exams ?? []).slice(0, 5).map((exam) => (
                    <div key={`${exam.subject}-${exam.examName ?? exam.daysUntil}`} className="surface-card min-w-[150px] rounded-[20px] p-4">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{exam.subject}</p>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">{exam.examName ?? "Exam"}</p>
                      <span className="mt-3 inline-flex rounded-full bg-[#7B6CF6]/12 px-2.5 py-1 text-xs font-medium text-[#7B6CF6]">
                        {exam.daysUntil} days
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <div className="surface-card rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">📚 Revision Due</p>
                  <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{payload?.revisionDue ?? 0}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">items today</p>
                </div>
                <div className="surface-card rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">📊 Yesterday</p>
                  <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">
                    {payload?.yesterdayProgress ? payload.yesterdayProgress.studyMinutes : 0}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {payload?.yesterdayProgress ? "minutes studied" : "No activity yesterday"}
                  </p>
                </div>
                <div className="surface-card rounded-[22px] p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">📅 Forecast</p>
                  <p className="mt-3 font-headline text-[2rem] capitalize text-[var(--foreground)]">{payload?.studyForecast ?? "light"}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">study day</p>
                </div>
              </section>

              {payload?.weakestTopic ? (
                <section className="surface-card rounded-[24px] p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Your weakest topic right now</p>
                  <p className="mt-3 font-headline text-[1.8rem] leading-none text-[var(--foreground)]">{payload.weakestTopic.topic}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="rounded-full bg-[#7B6CF6]/12 px-3 py-1 text-xs font-medium text-[#7B6CF6]">{payload.weakestTopic.subject}</span>
                    <Link
                      href={`/notes?topic=${encodeURIComponent(payload.weakestTopic.topic)}&subject=${encodeURIComponent(payload.weakestTopic.subject)}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-[#7B6CF6]"
                    >
                      Study Now <IconArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </section>
              ) : null}
            </>
          )}

          <Button onClick={dismiss} className="w-full gap-2 rounded-full">
            <IconSparkles className="h-4 w-4" />
            Let&apos;s Go <IconArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

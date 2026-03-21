"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBook2, IconCalendarStats, IconCalendarWeek, IconChartBar, IconClock, IconPlayerPlay } from "@tabler/icons-react";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

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
}

export function DailyBriefPanel() {
  const [payload, setPayload] = useState<BriefPayload | null>(null);

  useEffect(() => {
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
  }, []);

  if (!payload) {
    return <div className="h-[420px] animate-pulse rounded-[28px] bg-white/60 dark:bg-white/5" />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] p-6 text-center">
        <p className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">
          {payload.greeting}, {payload.profile.firstName}
        </p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">{payload.dateLabel}</p>
        <p className="mt-5 font-headline text-[1.35rem] italic leading-7 text-[var(--foreground)]">{payload.quote.text}</p>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">— {payload.quote.author}</p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <IconCalendarWeek className="h-4 w-4 text-[#7B6CF6]" />
          <p className="text-sm font-semibold text-[var(--foreground)]">Today&apos;s Study Plan</p>
        </div>
        {payload.todayPlan.length ? (
          <div className="flex flex-wrap gap-2">
            {payload.todayPlan.map((task, index) => {
              const color = SUBJECT_COLOR_VALUES[task.subject] ?? SUBJECT_COLOR_VALUES.Other;
              return (
                <span
                  key={`${task.subject}-${task.topic}-${index}`}
                  className="rounded-full border px-3 py-2 text-xs font-medium"
                  style={{ backgroundColor: `${color}18`, borderColor: `${color}55`, color }}
                >
                  {task.subject} • {task.topic} • {task.duration}m
                </span>
              );
            })}
          </div>
        ) : (
          <div className="surface-card rounded-[22px] p-4 text-sm text-[var(--muted-foreground)]">No study plan for today yet.</div>
        )}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Upcoming Exams</p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {payload.exams.slice(0, 5).map((exam) => (
            <div key={`${exam.subject}-${exam.examName ?? exam.daysUntil}`} className="surface-card min-w-[160px] rounded-[20px] p-4">
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
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
            <IconBook2 className="h-3.5 w-3.5" />
            Revision Due
          </p>
          <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{payload.revisionDue}</p>
          <p className="text-sm text-[var(--muted-foreground)]">items today</p>
        </div>
        <div className="surface-card rounded-[22px] p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
            <IconChartBar className="h-3.5 w-3.5" />
            Yesterday
          </p>
          <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{payload.yesterdayProgress?.studyMinutes ?? 0}</p>
          <p className="text-sm text-[var(--muted-foreground)]">{payload.yesterdayProgress ? "minutes studied" : "No activity"}</p>
        </div>
        <div className="surface-card rounded-[22px] p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
            <IconCalendarStats className="h-3.5 w-3.5" />
            Forecast
          </p>
          <p className="mt-3 font-headline text-[2rem] capitalize text-[var(--foreground)]">{payload.studyForecast}</p>
          <p className="text-sm text-[var(--muted-foreground)]">study day</p>
        </div>
      </section>

      {payload.weakestTopic ? (
        <section className="surface-card rounded-[24px] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">Current weak topic</p>
          <p className="mt-3 font-headline text-[1.8rem] leading-none text-[var(--foreground)]">{payload.weakestTopic.topic}</p>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="rounded-full bg-[#7B6CF6]/12 px-3 py-1 text-xs font-medium text-[#7B6CF6]">{payload.weakestTopic.subject}</span>
            <Link
              href={`/dashboard/study?tool=notes&topic=${encodeURIComponent(payload.weakestTopic.topic)}&subject=${encodeURIComponent(payload.weakestTopic.subject)}`}
              className="text-sm font-medium text-[#7B6CF6]"
            >
              Study this topic
            </Link>
          </div>
        </section>
      ) : null}

      <div className="flex justify-end">
        <Link href="/dashboard/study?tool=focus-room" className="contents">
          <Button className="gap-2 rounded-full">
            <IconClock className="h-4 w-4" />
            Start Focus Session
            <IconPlayerPlay className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

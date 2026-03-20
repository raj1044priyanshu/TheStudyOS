"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconArrowRight, IconCalendarStats, IconCircleCheckFilled, IconClockHour4, IconFlame, IconSparkles, IconTargetArrow, IconTrophy } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DailyBrief } from "@/components/dashboard/DailyBrief";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";

interface DashboardPayload {
  profile: {
    name: string;
  };
  onboarding: {
    shouldShowWelcome: boolean;
    shouldStartTour: boolean;
  };
  stats: {
    streak: number;
    level: number;
    xp: number;
    totalNotesGenerated: number;
    totalQuizzesTaken: number;
    averageQuizScore: number;
    studyMinutesWeek: number;
    pendingQuizzes: number;
    dailyGoalProgress: number;
    dailyGoalCompleted: number;
    dailyGoalTotal: number;
  };
  subjectBreakdown: {
    subject: string;
    minutes: number;
    percentage: number;
  }[];
  quizTimeline: {
    label: string;
    score: number;
  }[];
  recentAchievements: {
    id: string;
    title: string;
    description: string;
    unlockedAt: string;
  }[];
  dailyTasks: {
    id: string;
    label: string;
    completed: boolean;
  }[];
  pendingQuizzes: {
    id: string;
    topic: string;
    subject: string;
  }[];
  streakBreakAlert: {
    previous: number;
    brokenAt: string | null;
  } | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [streakAlertOpen, setStreakAlertOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      const payload = (await response.json()) as DashboardPayload;
      if (!response.ok) return;
      setData(payload);
      setStreakAlertOpen(Boolean(payload.streakBreakAlert));
    }

    void load();
  }, []);

  useEffect(() => {
    const onActiveTimeUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ studyMinutesWeek?: number }>).detail;
      if (!detail?.studyMinutesWeek) {
        return;
      }

      setData((previous) =>
        previous
          ? {
              ...previous,
              stats: {
                ...previous.stats,
                studyMinutesWeek: detail.studyMinutesWeek ?? previous.stats.studyMinutesWeek
              }
            }
          : previous
      );
    };

    window.addEventListener("studyos:active-time-updated", onActiveTimeUpdate as EventListener);
    return () => window.removeEventListener("studyos:active-time-updated", onActiveTimeUpdate as EventListener);
  }, []);

  async function dismissStreakBreakAlert() {
    await fetch("/api/streak/alert", { method: "PATCH" }).catch(() => null);
    setStreakAlertOpen(false);
  }

  const timelineBars = useMemo(() => {
    const source = data?.quizTimeline ?? [];
    if (source.length === 0) return [35, 48, 42, 62, 78, 55, 66];
    return source.slice(-7).map((item) => Math.max(18, Math.min(100, item.score)));
  }, [data?.quizTimeline]);

  if (!data) {
    return <div className="h-56 animate-pulse rounded-[2rem] border border-[hsl(var(--outline-variant))/0.18] bg-white/70" />;
  }

  const completionRate = data.stats.dailyGoalTotal > 0 ? Math.round((data.stats.dailyGoalCompleted / data.stats.dailyGoalTotal) * 100) : 0;
  const preferredName = data.profile.name.trim().split(/\s+/)[0] || data.profile.name;
  const statCards = [
    { label: "Streak", value: `${data.stats.streak}`, unit: "days", icon: IconFlame },
    { label: "Level", value: `${data.stats.level}`, unit: "current", icon: IconTrophy },
    { label: "XP", value: `${data.stats.xp}`, unit: "earned", icon: IconSparkles },
    { label: "Active study time", value: `${data.stats.studyMinutesWeek}`, unit: "mins this week", icon: IconClockHour4 }
  ];

  return (
    <div className="space-y-6">
      <DailyBrief />
      {streakAlertOpen && data.streakBreakAlert ? (
        <div className="fixed inset-0 z-[79] flex items-center justify-center bg-[rgba(28,27,41,0.25)] p-4 backdrop-blur-sm">
          <div className="glass-modal w-full max-w-md p-6 text-center">
            <p className="text-5xl">😢</p>
            <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Streak Broken</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
              Your {data.streakBreakAlert.previous}-day streak was broken. Start again today and rebuild stronger.
            </p>
            <Button className="mt-5" onClick={() => void dismissStreakBreakAlert()}>
              {"I'll restart now"}
            </Button>
          </div>
        </div>
      ) : null}

      <header className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr] xl:items-start">
        <div className="glass-card relative overflow-hidden p-6 md:p-7">
          <div className="pointer-events-none absolute -right-12 bottom-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(196,181,253,0.46),rgba(196,181,253,0))] blur-2xl" />
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Today</p>
          <h2
            className="mt-2 max-w-[10ch] font-headline text-[clamp(2.8rem,5vw,4.85rem)] leading-[0.93] tracking-[-0.045em] text-[var(--foreground)]"
            style={{ textWrap: "balance" }}
          >
            Good morning, {preferredName}.
          </h2>
          <p className="mt-3 max-w-xl text-base leading-7 text-[var(--muted-foreground)]">
            Your study workspace is ready with notes, tasks, quizzes, and progress gathered into one calm view.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge className="gap-1.5 normal-case tracking-normal">
              <IconFlame className="h-3.5 w-3.5 text-[#7B6CF6]" />
              {data.stats.streak} day streak
            </Badge>
            <Badge className="gap-1.5 normal-case tracking-normal">
              <IconTargetArrow className="h-3.5 w-3.5 text-[#7B6CF6]" />
              {data.stats.averageQuizScore}% avg quiz score
            </Badge>
          </div>
        </div>

        <div className="glass-card p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="27" stroke="rgba(196,181,253,0.35)" strokeWidth="5" />
              <circle
                cx="32"
                cy="32"
                r="27"
                stroke="#7B6CF6"
                strokeWidth="5"
                strokeDasharray="169"
                strokeDashoffset={169 - (169 * Math.min(100, completionRate)) / 100}
              />
              </svg>
              <span className="absolute font-headline text-2xl text-[var(--foreground)]">{completionRate}%</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Daily goal</p>
              <p className="font-headline text-[2.15rem] leading-[0.95] tracking-[-0.03em] text-[var(--foreground)]">Steady momentum</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                {data.stats.dailyGoalCompleted} of {data.stats.dailyGoalTotal || 0} tasks completed today.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <Progress value={completionRate} />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="surface-card rounded-[18px] p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--tertiary-foreground)]">Tasks ready</p>
              <p className="mt-2 text-lg font-medium text-[var(--foreground)]">{data.stats.dailyGoalTotal || 0} planned today</p>
            </div>
            <div className="surface-card rounded-[18px] p-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--tertiary-foreground)]">Pending quizzes</p>
              <p className="mt-2 text-lg font-medium text-[var(--foreground)]">{data.pendingQuizzes.length} waiting</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{card.label}</p>
                <p className="mt-3 font-headline text-[clamp(2.9rem,4vw,3.8rem)] tracking-[-0.04em] text-[#7B6CF6]">{card.value}</p>
                <p className="mt-1 text-xs text-[var(--tertiary-foreground)]">{card.unit}</p>
              </div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#7B6CF6]/10 text-[#7B6CF6]">
                <card.icon className="h-[18px] w-[18px]" />
              </span>
            </div>
            <div className="mt-4 h-[2px] rounded-full bg-[linear-gradient(90deg,#7B6CF6,rgba(123,108,246,0.1))]" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="glass-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Overview</p>
              <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)] md:text-[2.3rem]">Study rhythm</h3>
            </div>
            <Badge className="gap-1.5 normal-case tracking-normal">
              <IconTargetArrow className="h-3.5 w-3.5 text-[#7B6CF6]" />
              {data.stats.averageQuizScore}% avg quiz score
            </Badge>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="surface-card rounded-[22px] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Daily completion</p>
                    <p className="mt-2 font-headline text-5xl tracking-[-0.04em] text-[var(--foreground)]">{completionRate}%</p>
                  </div>
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#7B6CF6]/12 text-[#7B6CF6]">
                    <IconCalendarStats className="h-5 w-5" />
                  </span>
                </div>
                <Progress value={completionRate} className="mt-4" />
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  {data.stats.dailyGoalCompleted}/{data.stats.dailyGoalTotal || 0} agenda items completed today.
                </p>
              </div>

              <div className="surface-card rounded-[22px] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">Recent performance</h4>
                  <Link href="/progress" className="text-sm text-[#7B6CF6]">
                    View progress
                  </Link>
                </div>
                <div className="mt-5 flex h-40 items-end gap-2">
                  {timelineBars.map((height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className="w-full rounded-t-[16px]"
                      style={{
                        height: `${height}%`,
                        background: index === timelineBars.length - 1 ? "#7B6CF6" : "rgba(196,181,253,0.45)"
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="surface-card rounded-[22px] p-4">
              <h4 className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">Subject focus</h4>
              <div className="mt-4 space-y-4">
                {(data.subjectBreakdown.length ? data.subjectBreakdown : [{ subject: "General", minutes: 0, percentage: 0 }]).slice(0, 5).map((item) => {
                  const subjectColor = SUBJECT_COLOR_VALUES[item.subject] ?? SUBJECT_COLOR_VALUES.Other;
                  return (
                    <div key={item.subject}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <p className="font-medium text-[var(--foreground)]">{item.subject}</p>
                        <p className="text-[var(--muted-foreground)]">{item.minutes} min</p>
                      </div>
                      <div className="h-2 rounded-full bg-[color:var(--chart-grid)]">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(8, item.percentage)}%`, backgroundColor: subjectColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Tasks</p>
              <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)] md:text-[2.3rem]">{"Today's agenda"}</h3>
            </div>
            <Link href="/planner">
              <Button variant="secondary" size="sm">Open planner</Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {data.dailyTasks.length === 0 ? (
              <p className="surface-dashed rounded-[20px] px-4 py-5 text-sm text-[var(--muted-foreground)]">
                No active plan for today yet. Generate a study planner to fill this view.
              </p>
            ) : (
              data.dailyTasks.map((task) => (
                <div key={task.id} className="surface-card rounded-[20px] p-4">
                  <span className={`mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full ${task.completed ? "bg-[#6EE7B7]/22 text-[#0F766E]" : "bg-[#7B6CF6]/10 text-[#7B6CF6]"}`}>
                    <IconCircleCheckFilled className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">{task.label}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">{task.completed ? "Completed" : "Queued for today"}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Queue</p>
              <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)] md:text-[2.3rem]">Pending quizzes</h3>
            </div>
            <Link href="/quiz">
              <Button size="sm" className="gap-1.5">
                Take quiz <IconArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {data.pendingQuizzes.length === 0 ? (
              <p className="surface-dashed rounded-[20px] px-4 py-5 text-sm text-[var(--muted-foreground)]">
                No pending quizzes right now. Create a new quiz whenever you want a quick mastery check.
              </p>
            ) : (
              data.pendingQuizzes.map((quiz) => {
                const subjectColor = SUBJECT_COLOR_VALUES[quiz.subject] ?? SUBJECT_COLOR_VALUES.Other;
                return (
                  <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="surface-card surface-card-hover block rounded-[20px] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{quiz.topic}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{quiz.subject}</p>
                      </div>
                      <span className="h-8 w-1 rounded-full" style={{ backgroundColor: subjectColor }} />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        <section className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Wins</p>
              <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)] md:text-[2.3rem]">Recent achievements</h3>
            </div>
            <Link href="/progress">
              <Button variant="outline" size="sm">Analytics</Button>
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {data.recentAchievements.length === 0 ? (
              <p className="surface-dashed rounded-[20px] px-4 py-5 text-sm text-[var(--muted-foreground)]">
                Achievements will appear as you generate notes, finish quizzes, and keep your streak alive.
              </p>
            ) : (
              data.recentAchievements.map((achievement) => (
                <div key={achievement.id} className="surface-card rounded-[20px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{achievement.title}</p>
                    <Badge className="normal-case tracking-normal">Unlocked</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{achievement.description}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

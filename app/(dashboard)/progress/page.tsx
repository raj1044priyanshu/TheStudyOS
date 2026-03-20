"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconClockHour4, IconFlame, IconNotebook, IconSparkles, IconTargetArrow, IconTrophy } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { ProgressCharts } from "@/components/progress/ProgressCharts";
import { EmptyState } from "@/components/shared/EmptyState";

interface ProgressResponse {
  stats: {
    streak: number;
    xp: number;
    level: number;
    totalNotesGenerated: number;
    totalQuizzesTaken: number;
    averageQuizScore: number;
    studyMinutesWeek: number;
  };
  subjectBreakdown: { subject: string; minutes: number }[];
  quizTimeline: { date: string; score: number }[];
  weeklyHeatmap: { date: string; value: number }[];
  weakTopics: { topic: string; score: number }[];
  todayMinutes?: number;
}

interface AchievementsResponse {
  achievements: { type: string; title: string; description: string; unlockedAt: string }[];
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementsResponse["achievements"]>([]);
  const chartsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      const [progressResponse, achievementsResponse] = await Promise.all([
        fetch("/api/progress").then((res) => res.json()),
        fetch("/api/achievements").then((res) => res.json())
      ]);
      setProgress(progressResponse);
      setAchievements(achievementsResponse.achievements ?? []);
    }
    void load();
  }, []);

  useEffect(() => {
    const onActiveTimeUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{
        studyMinutesWeek?: number;
        todayMinutes?: number;
      }>).detail;

      if (!detail) {
        return;
      }

      setProgress((previous) =>
        previous
          ? {
              ...previous,
              stats: {
                ...previous.stats,
                studyMinutesWeek: detail.studyMinutesWeek ?? previous.stats.studyMinutesWeek
              },
              todayMinutes: detail.todayMinutes ?? previous.todayMinutes
            }
          : previous
      );
    };

    window.addEventListener("studyos:active-time-updated", onActiveTimeUpdate as EventListener);
    return () => window.removeEventListener("studyos:active-time-updated", onActiveTimeUpdate as EventListener);
  }, []);

  if (!progress) {
    return <div className="surface-card h-40 animate-pulse rounded-xl" />;
  }

  function focusCharts() {
    chartsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    chartsRef.current?.focus({ preventScroll: true });
  }

  const stats = [
    { title: "Current streak", value: `${progress.stats.streak}`, meta: "days", icon: IconFlame, tourId: "progress-streak-card", onClick: focusCharts },
    { title: "Notes generated", value: `${progress.stats.totalNotesGenerated}`, meta: "saved", icon: IconNotebook },
    { title: "Quiz average", value: `${progress.stats.averageQuizScore}%`, meta: `${progress.stats.totalQuizzesTaken} quizzes`, icon: IconTargetArrow },
    { title: "Active study time", value: `${progress.stats.studyMinutesWeek}`, meta: "mins this week", icon: IconClockHour4 },
    { title: "XP", value: `${progress.stats.xp}`, meta: "earned", icon: IconSparkles },
    { title: "Level", value: `${progress.stats.level}`, meta: "current", icon: IconTrophy }
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Analytics</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Progress</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Review study rhythm, performance, streaks, and milestones in one quieter dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((item, index) => (
          <motion.div key={item.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: index * 0.03 }}>
            {item.onClick ? (
              <button
                type="button"
                data-tour-id={item.tourId}
                onClick={item.onClick}
                className="glass-card surface-card-hover w-full p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{item.title}</p>
                    <p className="mt-3 font-headline text-5xl tracking-[-0.04em] text-[#7B6CF6]">{item.value}</p>
                    <p className="mt-1 text-xs text-[var(--tertiary-foreground)]">{item.meta}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#7B6CF6]/10 text-[#7B6CF6]">
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                </div>
              </button>
            ) : (
              <div className="glass-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.08em] text-[var(--muted-foreground)]">{item.title}</p>
                    <p className="mt-3 font-headline text-5xl tracking-[-0.04em] text-[#7B6CF6]">{item.value}</p>
                    <p className="mt-1 text-xs text-[var(--tertiary-foreground)]">{item.meta}</p>
                  </div>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#7B6CF6]/10 text-[#7B6CF6]">
                    <item.icon className="h-[18px] w-[18px]" />
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div ref={chartsRef} tabIndex={-1} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <ProgressCharts
          subjectBreakdown={progress.subjectBreakdown}
          quizTimeline={progress.quizTimeline}
        />
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Focus risks</p>
              <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Weak topics</h3>
            </div>
            <Badge className="normal-case tracking-normal">{progress.weakTopics.length} flagged</Badge>
          </div>

          {progress.weakTopics.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No weak topics" description="Great progress. Keep the momentum going." />
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {progress.weakTopics.map((topic) => (
                <div key={topic.topic} className="surface-card rounded-[20px] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-[var(--foreground)]">{topic.topic}</p>
                    <span className="rounded-full bg-[#FCA5A5]/20 px-3 py-1 text-xs text-[#B91C1C]">{topic.score}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Milestones</p>
              <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Achievements</h3>
            </div>
            <Badge className="normal-case tracking-normal">{achievements.length} unlocked</Badge>
          </div>

          {achievements.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">No achievements unlocked yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {achievements.slice(0, 8).map((achievement, index) => (
                <motion.div
                  key={`${achievement.type}-${index}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="surface-card rounded-[20px] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{achievement.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted-foreground)]">{achievement.description}</p>
                    </div>
                    <Badge className="normal-case tracking-normal">Unlocked</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

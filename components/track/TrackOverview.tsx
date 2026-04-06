"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconClockHour4, IconFlame, IconTrophy } from "@tabler/icons-react";
import { ProgressCharts } from "@/components/progress/ProgressCharts";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";

interface ProgressResponse {
  stats: {
    streak: number;
    xp: number;
    level: number;
    totalNotesGenerated: number;
    totalQuizzesTaken: number;
    averageQuizScore: number;
    averageCheckpointScore: number;
    totalCheckpoints: number;
    passedCheckpoints: number;
    studyMinutesWeek: number;
  };
  subjectBreakdown: { subject: string; minutes: number }[];
  quizTimeline: { date: string; score: number }[];
  weeklyHeatmap: { date: string; value: number }[];
  weakTopics: { topic: string; score: number }[];
  recentCheckpoints: { subject: string; chapter: string; score: number; passed: boolean; updatedAt: string }[];
  weakConcepts: { concept: string; averageScore: number; attempts: number }[];
  weakQuestionTypes: { questionType: string; averageScore: number; attempts: number }[];
  assessmentTrend: { chapter: string; score: number; date: string }[];
  recommendedActions: { chapter: string; concept: string; recommendedAction: string; score: number }[];
}

interface BriefResponse {
  exams: Array<{ _id?: string; subject: string; examName?: string; daysUntil: number }>;
}

interface AchievementsResponse {
  achievements: Array<{ achievementId?: string; type?: string; title?: string; description?: string; unlockedAt?: string }>;
  definitions: Array<{ id: string; name: string; desc: string; color: string }>;
  progress: {
    currentXp: number;
    levelName: string;
    progressToNextLevel: number;
  };
}

interface RecentAchievement {
  id: string;
  name: string;
  desc: string;
  color: string;
  unlockedAt?: string;
}

export function TrackOverview() {
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [achievements, setAchievements] = useState<AchievementsResponse | null>(null);

  useEffect(() => {
    async function load() {
      const [progressResponse, briefResponse, achievementsResponse] = await Promise.all([
        fetch("/api/progress", { cache: "no-store" }),
        fetch("/api/brief", { cache: "no-store" }),
        fetch("/api/achievements", { cache: "no-store" })
      ]);

      const progressData = (await progressResponse.json().catch(() => null)) as ProgressResponse | null;
      const briefData = (await briefResponse.json().catch(() => null)) as BriefResponse | null;
      const achievementsData = (await achievementsResponse.json().catch(() => null)) as AchievementsResponse | null;

      if (progressResponse.ok && progressData) setProgress(progressData);
      if (briefResponse.ok && briefData) setBrief(briefData);
      if (achievementsResponse.ok && achievementsData) setAchievements(achievementsData);
    }

    void load();
  }, []);

  const recentAchievements = useMemo<RecentAchievement[]>(() => {
    if (!achievements) {
      return [];
    }
    const items: RecentAchievement[] = [];

    achievements.achievements.forEach((record) => {
      const definition = achievements.definitions.find((item) => item.id === (record.achievementId ?? record.type));
      if (!definition) {
        return;
      }

      items.push({
        ...definition,
        unlockedAt: record.unlockedAt
      });
    });

    return items.slice(-3).reverse();
  }, [achievements]);

  if (!progress || !brief || !achievements) {
    return <div className="h-[620px] animate-pulse rounded-[30px] bg-white/60 dark:bg-white/5" />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Section A</p>
          <h2 className="font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Your Week at a Glance</h2>
        </div>
        <div id="study-heatmap" className="glass-card rounded-[30px] p-5 md:p-6">
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-15">
            {progress.weeklyHeatmap.slice(-30).map((cell) => {
              const intensity = Math.min(1, cell.value / 90);
              return (
                <div key={cell.date} className="space-y-1">
                  <div
                    className="h-10 rounded-[14px]"
                    style={{
                      background: `rgba(123,108,246,${0.12 + intensity * 0.6})`
                    }}
                    title={`${cell.date}: ${cell.value} minutes`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="surface-card rounded-[22px] p-4">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
                <IconFlame className="h-3.5 w-3.5" />
                Streak
              </p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{progress.stats.streak} days</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
                <IconClockHour4 className="h-3.5 w-3.5" />
                Study Time
              </p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{Math.round(progress.stats.studyMinutesWeek / 60)}h</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
                <IconTrophy className="h-3.5 w-3.5" />
                Avg Quiz Score
              </p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{progress.stats.averageQuizScore}%</p>
            </div>
            <div className="surface-card rounded-[22px] p-4">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
                <IconTrophy className="h-3.5 w-3.5" />
                Checkpoint Avg
              </p>
              <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{progress.stats.averageCheckpointScore}%</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                {progress.stats.passedCheckpoints}/{progress.stats.totalCheckpoints} passed
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Section B & C</p>
          <h2 className="font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Subject Breakdown and Quiz Performance</h2>
        </div>
        <ProgressCharts subjectBreakdown={progress.subjectBreakdown} quizTimeline={progress.quizTimeline} />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {progress.recentCheckpoints.length ? (
            progress.recentCheckpoints.map((checkpoint) => (
              <div key={`${checkpoint.subject}-${checkpoint.chapter}-${checkpoint.updatedAt}`} className="glass-card rounded-[24px] p-5">
                <p className="text-sm text-[var(--muted-foreground)]">{checkpoint.subject}</p>
                <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{checkpoint.chapter}</h3>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  Checkpoint score: {checkpoint.score}% • {checkpoint.passed ? "Passed" : "Revise again"}
                </p>
              </div>
            ))
          ) : (
            <div className="glass-card rounded-[24px] p-5 text-sm text-[var(--muted-foreground)]">
              Your latest checkpoint results will appear here as you clear planner chapters.
            </div>
          )}
        </div>
        <div id="weak-topics-section" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {progress.weakTopics.length ? (
            progress.weakTopics.map((topic) => (
              <div key={topic.topic} className="glass-card rounded-[24px] p-5">
                <p className="text-sm text-[#B91C1C]">Weak topic</p>
                <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{topic.topic}</h3>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">Average quiz score: {topic.score}%</p>
                <Link
                  href={`/dashboard/study?tool=notes&topic=${encodeURIComponent(topic.topic)}`}
                  className="mt-4 inline-flex text-sm font-medium text-[#7B6CF6]"
                >
                  Study now
                </Link>
              </div>
            ))
          ) : (
            <div className="glass-card rounded-[24px] p-5 text-sm text-[var(--muted-foreground)]">No weak topics flagged right now.</div>
          )}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="glass-card rounded-[28px] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Where you&apos;re falling short</p>
            <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Concept gaps</h3>
            <div className="mt-4 space-y-3">
              {progress.weakConcepts.length ? (
                progress.weakConcepts.map((item) => (
                  <div key={item.concept} className="surface-card rounded-[20px] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--foreground)]">{item.concept}</p>
                      <span className="rounded-full bg-[#FCA5A5]/18 px-3 py-1 text-xs font-semibold text-[#B91C1C]">{item.averageScore}%</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.attempts} scored question{item.attempts === 1 ? "" : "s"} across recent assessments</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No major concept gaps are showing right now.</p>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[28px] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">What to work on next</p>
            <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Assessment actions</h3>
            <div className="mt-4 space-y-3">
              {progress.recommendedActions.length ? (
                progress.recommendedActions.map((item, index) => (
                  <div key={`${item.chapter}-${item.concept}-${index}`} className="surface-card rounded-[20px] p-4">
                    <p className="font-medium text-[var(--foreground)]">{item.chapter}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">{item.concept}</p>
                    <p className="mt-3 text-sm leading-6 text-[var(--foreground)]">{item.recommendedAction}</p>
                    <Link
                      href={`/dashboard/study?tool=notes&topic=${encodeURIComponent(item.concept || item.chapter)}`}
                      className="mt-4 inline-flex text-sm font-medium text-[#7B6CF6]"
                    >
                      Revise this now
                    </Link>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Complete a few chapter assessments to unlock targeted next steps.</p>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="glass-card rounded-[28px] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Question-type pattern</p>
            <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Formats to practice more</h3>
            <div className="mt-4 space-y-3">
              {progress.weakQuestionTypes.length ? (
                progress.weakQuestionTypes.map((item) => (
                  <div key={item.questionType} className="surface-card rounded-[20px] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium capitalize text-[var(--foreground)]">{item.questionType.replace("_", " ")}</p>
                      <span className="rounded-full bg-[#FCD34D]/18 px-3 py-1 text-xs font-semibold text-[#A16207]">{item.averageScore}%</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.attempts} graded responses</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No weak question format is standing out yet.</p>
              )}
            </div>
          </div>

          <div className="glass-card rounded-[28px] p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Assessment trend</p>
            <h3 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Recent chapter scores</h3>
            <div className="mt-4 space-y-3">
              {progress.assessmentTrend.length ? (
                progress.assessmentTrend.slice(-6).reverse().map((item) => (
                  <div key={`${item.chapter}-${item.date}`} className="surface-card rounded-[20px] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--foreground)]">{item.chapter}</p>
                      <span className="rounded-full bg-[var(--surface-low)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">{item.score}%</span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">{new Date(item.date).toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">Your chapter-assessment trend will appear here after the first few attempts.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Section D</p>
          <h2 className="font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Achievements</h2>
        </div>
        <div className="glass-card rounded-[30px] p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-4 md:grid-cols-3">
              {recentAchievements.map((achievement) => (
                <div key={achievement.id} className="surface-card rounded-[22px] p-4">
                  <p className="font-medium text-[var(--foreground)]">{achievement.name}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{achievement.desc}</p>
                </div>
              ))}
            </div>
            <div className="md:min-w-[220px]">
              <p className="text-sm text-[var(--muted-foreground)]">Progress to next level</p>
              <p className="mt-2 font-headline text-3xl text-[var(--foreground)]">{achievements.progress.levelName}</p>
              <div className="mt-3 h-2 rounded-full bg-[color:var(--surface-low)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#7B6CF6,#6EE7B7)]"
                  style={{ width: `${achievements.progress.progressToNextLevel}%` }}
                />
              </div>
              <Link href="/dashboard/profile" className="mt-4 inline-flex text-sm font-medium text-[#7B6CF6]">
                View all
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Section E</p>
          <h2 className="font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Exam Readiness</h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {brief.exams.length ? (
            brief.exams.map((exam) => {
              const subjectColor = SUBJECT_COLOR_VALUES[exam.subject] ?? SUBJECT_COLOR_VALUES.Other;
              return (
                <div key={`${exam.subject}-${exam.examName ?? exam.daysUntil}`} className="glass-card rounded-[26px] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{exam.subject}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{exam.examName ?? "Upcoming exam"}</p>
                    </div>
                    <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${subjectColor}18`, color: subjectColor }}>
                      {exam.daysUntil} days
                    </span>
                  </div>
                  <Link href="/dashboard/plan?tool=exams" className="mt-4 inline-flex text-sm font-medium text-[#7B6CF6]">
                    View plan
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="glass-card rounded-[26px] p-5 text-sm text-[var(--muted-foreground)]">No upcoming exams yet.</div>
          )}
        </div>
      </section>
    </div>
  );
}

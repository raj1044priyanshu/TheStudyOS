"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { QuizAutopsy } from "@/types";

const MISTAKE_STYLE = {
  misconception: { label: "🧠 Misconception", className: "bg-[#A78BFA]/20 text-[#6D28D9]" },
  silly_error: { label: "✏️ Silly Error", className: "bg-[#FCD34D]/20 text-[#A16207]" },
  knowledge_gap: { label: "❓ Knowledge Gap", className: "bg-[#FCA5A5]/20 text-[#B91C1C]" },
  guessed: { label: "🎲 Guessed", className: "bg-slate-300/20 text-slate-700 dark:text-slate-200" },
  time_pressure: { label: "⏱ Time Pressure", className: "bg-[#38BDF8]/20 text-[#0369A1]" }
} as const;

interface QuizPayload {
  _id: string;
  topic: string;
  subject: string;
  score: number;
  completedAt?: string | null;
}

export function AutopsyReport({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [autopsy, setAutopsy] = useState<QuizAutopsy | null>(null);
  const [celebration, setCelebration] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [quizResponse, autopsyResponse] = await Promise.all([
          fetch(`/api/quiz/${quizId}`),
          fetch(`/api/quiz/${quizId}/autopsy`, { method: "POST" })
        ]);

        const quizData = await quizResponse.json();
        const autopsyData = await autopsyResponse.json();

        if (!quizResponse.ok) {
          throw new Error(quizData.error ?? "Quiz not found");
        }
        if (!autopsyResponse.ok) {
          throw new Error(autopsyData.error ?? "Autopsy could not be generated. Please try again.");
        }

        setQuiz(quizData.quiz);
        if (autopsyData.celebration) {
          setCelebration(true);
          setAutopsy(null);
        } else {
          setAutopsy({
            ...autopsyData.autopsy,
            generatedAt: new Date(autopsyData.autopsy.generatedAt).toISOString()
          });
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Autopsy could not be generated. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [quizId]);

  const weakTopicQuery = useMemo(() => autopsy?.weakTopics.map((item) => item.topic).join(", ") ?? "", [autopsy]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-52 rounded-[2rem]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-[2rem]" />
          <Skeleton className="h-64 rounded-[2rem]" />
        </div>
        <Skeleton className="h-40 rounded-[2rem]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card mx-auto max-w-3xl p-8 text-center">
        <h2 className="font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Autopsy unavailable</h2>
        <p className="mt-3 text-sm text-[var(--muted-foreground)]">{error}</p>
        <Button className="mt-5" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!quiz) {
    return null;
  }

  if (celebration) {
    return (
      <div className="glass-card mx-auto max-w-4xl p-10 text-center">
        <p className="text-6xl">🎉</p>
        <h2 className="mt-4 font-headline text-5xl tracking-[-0.04em] text-[var(--foreground)]">Perfect score</h2>
        <p className="mt-3 text-base leading-7 text-[var(--muted-foreground)]">
          You scored 100% on {quiz.topic}. No autopsy needed because nothing went wrong.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/quiz">
            <Button>Take another quiz</Button>
          </Link>
          <Link href={`/notes?subject=${encodeURIComponent(quiz.subject)}&topic=${encodeURIComponent(quiz.topic)}`}>
            <Button variant="outline">Review notes</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!autopsy) {
    return null;
  }

  const showRadar = autopsy.mistakeBreakdown.length >= 3 && autopsy.radarData.length > 0;

  return (
    <div className="space-y-5">
      <section className="glass-card overflow-hidden p-6 md:p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">🔬 Exam Autopsy</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] md:text-6xl">{quiz.topic}</h1>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {quiz.subject} • {quiz.completedAt ? new Date(quiz.completedAt).toLocaleDateString() : "Recently completed"}
            </p>
          </div>
          <div className="rounded-[22px] border border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] px-5 py-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Total score</p>
            <p className="mt-1 font-headline text-4xl text-[var(--foreground)]">{quiz.score}%</p>
          </div>
        </div>
      </section>

      <div className={`grid gap-4 ${showRadar ? "xl:grid-cols-[1.2fr_0.8fr]" : ""}`}>
        {showRadar ? (
          <section className="glass-card p-6">
            <h2 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Strength profile</h2>
            <div className="mt-4 h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={autopsy.radarData}>
                  <PolarGrid stroke="var(--chart-grid)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "var(--foreground)", fontSize: 12 }} />
                  <Radar dataKey="score" stroke="#7B6CF6" fill="#7B6CF6" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : null}

        <section className="glass-card p-6">
          <h2 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Overall pattern</h2>
          <p className="mt-4 font-headline text-2xl italic leading-9 text-[var(--foreground)] opacity-90">{autopsy.overallPattern}</p>
        </section>
      </div>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Breakdown</p>
          <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Mistake breakdown</h2>
        </div>

        {autopsy.mistakeBreakdown.map((mistake) => {
          const tone = MISTAKE_STYLE[mistake.mistakeType];
          return (
            <article key={`${mistake.questionIndex}-${mistake.questionText}`} className="glass-card p-5">
              <p className="text-sm leading-7 text-[var(--foreground)]">{mistake.questionText}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-[20px] border border-[#FCA5A5]/40 bg-[#FCA5A5]/12 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#B91C1C]">Your answer</p>
                  <p className="mt-2 text-sm line-through text-[#991B1B]">{mistake.studentAnswer || "No answer"}</p>
                </div>
                <div className="rounded-[20px] border border-[#6EE7B7]/40 bg-[#6EE7B7]/12 p-4">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#0F766E]">Correct answer</p>
                  <p className="mt-2 text-sm font-semibold text-[#0F766E]">{mistake.correctAnswer}</p>
                </div>
              </div>
              <div className="mt-4">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.className}`}>{tone.label}</span>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{mistake.explanation}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Weak spots</p>
          <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Your Achilles topics</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {autopsy.weakTopics.map((topic) => (
            <article key={topic.topic} className="glass-card p-5">
              <h3 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{topic.topic}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">{topic.reason}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/notes?subject=${encodeURIComponent(quiz.subject)}&topic=${encodeURIComponent(topic.topic)}`}>
                  <Button size="sm">📝 Generate Notes</Button>
                </Link>
                <Link href={`/quiz?subject=${encodeURIComponent(quiz.subject)}&topic=${encodeURIComponent(topic.topic)}`}>
                  <Button size="sm" variant="outline">🧪 Retake Quiz</Button>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Strengths</p>
            <h2 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">You're strong at</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {autopsy.strengthTopics.map((topic) => (
              <span key={topic} className="rounded-full bg-[#6EE7B7]/18 px-4 py-2 text-sm font-medium text-[#047857]">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Link href={`/planner?weakTopics=${encodeURIComponent(weakTopicQuery)}&subject=${encodeURIComponent(quiz.subject)}`}>
          <Button>Generate Revision Plan for Weak Topics</Button>
        </Link>
      </div>
    </div>
  );
}

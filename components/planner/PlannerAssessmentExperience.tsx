"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { IconArrowLeft, IconBook2, IconChartBar, IconProgressCheck, IconSparkles } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { queueCelebrationsFromGamification } from "@/lib/client-celebrations";
import { cn } from "@/lib/utils";
import type { PlannerCheckpointQuestion, PlannerCheckpointSummary } from "@/types";

function difficultyTone(value: PlannerCheckpointQuestion["difficulty"]) {
  if (value === "hard") return "bg-[#FCA5A5]/18 text-[#B91C1C]";
  if (value === "medium") return "bg-[#FCD34D]/18 text-[#A16207]";
  return "bg-[#6EE7B7]/18 text-[#047857]";
}

function resultTone(obtainedMarks: number, maxMarks: number) {
  const ratio = maxMarks === 0 ? 0 : obtainedMarks / maxMarks;
  if (ratio >= 0.8) return "border-[#6EE7B7]/40 bg-[#6EE7B7]/12";
  if (ratio >= 0.5) return "border-[#FCD34D]/40 bg-[#FCD34D]/12";
  return "border-[#FCA5A5]/45 bg-[#FCA5A5]/10";
}

export function PlannerAssessmentExperience({ checkpointId }: { checkpointId: string }) {
  const router = useRouter();
  const [checkpoint, setCheckpoint] = useState<PlannerCheckpointSummary | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const response = await fetch(`/api/planner/checkpoint/${checkpointId}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!active) return;

      if (!response.ok || !data.checkpoint) {
        toast.error(data.error ?? "Assessment not found");
        router.push("/dashboard/plan?tool=planner");
        return;
      }

      setCheckpoint(data.checkpoint);
      setAnswers(Array.from({ length: data.checkpoint.questions?.length ?? 0 }, () => ""));
      setLoading(false);
    }

    void load();
    return () => {
      active = false;
    };
  }, [checkpointId, router]);

  const canSubmit = useMemo(() => answers.some((answer) => answer.trim().length > 0), [answers]);
  const latestAttempt = checkpoint?.attempts?.at(-1) ?? null;

  function updateAnswer(index: number, value: string) {
    setAnswers((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  async function submitAssessment() {
    if (!checkpoint) {
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/planner/checkpoint", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkpointId: checkpoint._id,
        answers,
        subject: checkpoint.subject
      })
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok || !data.checkpoint) {
      toast.error(data.error ?? "Could not evaluate the assessment");
      return;
    }

    setCheckpoint(data.checkpoint);
    setAnswers(Array.from({ length: data.checkpoint.questions?.length ?? 0 }, () => ""));
    queueCelebrationsFromGamification(data.events, "planner-checkpoint");

    if (data.checkpoint.passed) {
      toast.success(`Assessment passed with ${data.checkpoint.score}%`);
    } else {
      toast.error(`Assessment score ${data.checkpoint.score}%. Review the weak areas and retry.`);
    }
  }

  if (loading || !checkpoint) {
    return (
      <div className="glass-card rounded-[32px] p-6">
        <div className="h-10 w-48 animate-pulse rounded-full bg-white/60 dark:bg-white/10" />
        <div className="mt-6 space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-[28px] bg-white/60 dark:bg-white/10" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-[32px] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Planner Assessment</p>
            <h1 className="font-headline text-[clamp(2.4rem,5vw,3.8rem)] tracking-[-0.04em] text-[var(--foreground)]">{checkpoint.chapter}</h1>
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">
              Mixed-format chapter assessment for {checkpoint.subject}. You need 50% or more to clear this planner task.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => router.push("/dashboard/plan?tool=planner")}>
              <IconArrowLeft className="h-4 w-4" />
              Back to planner
            </Button>
            <Button onClick={() => void submitAssessment()} disabled={!canSubmit || submitting}>
              {submitting ? "Evaluating..." : checkpoint.attempts.length ? "Submit another attempt" : "Submit assessment"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="surface-card rounded-[24px] p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
              <IconBook2 className="h-3.5 w-3.5" />
              Coverage
            </p>
            <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{checkpoint.coverageOutline.length} subtopics</p>
          </div>
          <div className="surface-card rounded-[24px] p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
              <IconChartBar className="h-3.5 w-3.5" />
              Latest score
            </p>
            <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{checkpoint.score}%</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {checkpoint.obtainedMarks}/{checkpoint.totalMarks} marks
            </p>
          </div>
          <div className="surface-card rounded-[24px] p-4">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
              <IconProgressCheck className="h-3.5 w-3.5" />
              Attempts
            </p>
            <p className="mt-3 font-headline text-[2rem] text-[var(--foreground)]">{checkpoint.attempts.length}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{checkpoint.passed ? "Chapter cleared" : "Needs another pass"}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {checkpoint.coverageOutline.map((item) => (
            <span key={item} className="rounded-full bg-[var(--surface-panel-strong)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]">
              {item}
            </span>
          ))}
        </div>
      </section>

      {latestAttempt ? (
        <section className={cn("rounded-[30px] border p-5 md:p-6", checkpoint.passed ? "border-[#6EE7B7]/45 bg-[#6EE7B7]/10" : "border-[#FCA5A5]/45 bg-[#FCA5A5]/10")}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Latest evaluation</p>
              <h2 className="mt-2 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">
                {checkpoint.score}% {checkpoint.passed ? "passed" : "needs work"}
              </h2>
            </div>
            {checkpoint.latestAttemptAt ? (
              <p className="text-sm text-[var(--muted-foreground)]">Last attempt: {new Date(checkpoint.latestAttemptAt).toLocaleString()}</p>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {checkpoint.feedback.map((item) => (
              <div key={item} className="surface-card rounded-[20px] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-4">
        {checkpoint.questions.map((question, index) => {
          const latestResult = checkpoint.questionResults.find((item) => item.questionIndex === index);
          return (
            <div key={`${question.prompt}-${index}`} className="glass-card rounded-[28px] p-5 md:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--surface-panel-strong)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
                  {question.type.replace("_", " ")}
                </span>
                <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]", difficultyTone(question.difficulty))}>
                  {question.difficulty}
                </span>
                <span className="rounded-full bg-[var(--surface-panel-strong)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">
                  {question.maxMarks} marks
                </span>
                <span className="rounded-full bg-[var(--surface-low)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)]">{question.concept}</span>
              </div>

              <p className="mt-4 text-base font-medium leading-7 text-[var(--foreground)]">{question.prompt}</p>

              {question.type === "objective" && question.options?.length ? (
                <div className="mt-4 space-y-3">
                  {question.options.map((option) => (
                    <label key={option} className="flex items-center gap-3 rounded-[20px] border border-[color:var(--panel-border)] px-4 py-3 text-sm text-[var(--foreground)]">
                      <input
                        type="radio"
                        name={`assessment-${index}`}
                        checked={answers[index] === option}
                        onChange={() => updateAnswer(index, option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {(question.type === "fill_blank" || question.type === "numerical") ? (
                <div className="mt-4">
                  <Input value={answers[index] ?? ""} onChange={(event) => updateAnswer(index, event.target.value)} placeholder="Write your answer" />
                </div>
              ) : null}

              {(question.type === "short" || question.type === "long" || question.type === "case") ? (
                <div className="mt-4">
                  <Textarea
                    value={answers[index] ?? ""}
                    onChange={(event) => updateAnswer(index, event.target.value)}
                    placeholder="Write your answer"
                    className={question.type === "long" || question.type === "case" ? "min-h-[180px]" : "min-h-[120px]"}
                  />
                </div>
              ) : null}

              {latestResult ? (
                <div className={cn("mt-5 rounded-[22px] border p-4 text-sm", resultTone(latestResult.obtainedMarks, latestResult.maxMarks))}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--foreground)]">
                      {latestResult.obtainedMarks}/{latestResult.maxMarks} marks
                    </p>
                    {latestResult.recommendedAction ? (
                      <span className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
                        <IconSparkles className="h-3.5 w-3.5" />
                        next focus
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 leading-6 text-[var(--muted-foreground)]">{latestResult.feedback}</p>
                  {latestResult.recommendedAction ? (
                    <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em] text-[var(--foreground)]">{latestResult.recommendedAction}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </section>

      {checkpoint.attempts.length > 1 ? (
        <section className="glass-card rounded-[30px] p-5 md:p-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Attempt history</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {checkpoint.attempts
              .slice()
              .reverse()
              .map((attempt, index) => (
                <div key={`${attempt.submittedAt}-${index}`} className="surface-card rounded-[22px] p-4">
                  <p className="font-medium text-[var(--foreground)]">{attempt.score}%</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    {attempt.obtainedMarks}/{attempt.totalMarks} marks • {attempt.passed ? "Passed" : "Retry required"}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{new Date(attempt.submittedAt).toLocaleString()}</p>
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

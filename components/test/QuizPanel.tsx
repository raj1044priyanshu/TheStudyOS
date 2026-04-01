"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SUBJECTS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { PlannerQuizContext } from "@/types";

interface QuizSummary {
  _id: string;
  topic: string;
  subject: string;
  score: number | null;
  totalQuestions: number;
  completedAt: string | null;
  hasAutopsy: boolean;
}

const QUESTION_COUNTS = [5, 10, 15, 20] as const;

export function QuizPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState<(typeof QUESTION_COUNTS)[number]>(10);
  const [loading, setLoading] = useState(false);
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
  const plannerContext = useMemo<PlannerQuizContext | null>(() => {
    if (searchParams.get("source") !== "planner") {
      return null;
    }

    const planId = searchParams.get("planId")?.trim() ?? "";
    const date = searchParams.get("date")?.trim() ?? "";
    const taskIndexValue = Number(searchParams.get("taskIndex"));
    if (!planId || !date || !Number.isInteger(taskIndexValue) || taskIndexValue < 0) {
      return null;
    }

    return {
      planId,
      date,
      taskIndex: taskIndexValue
    };
  }, [searchParams]);

  useEffect(() => {
    const nextTopic = searchParams.get("topic");
    const nextSubject = searchParams.get("subject");
    const nextDifficulty = searchParams.get("difficulty");

    if (nextTopic) setTopic(nextTopic);
    if (nextSubject) setSubject(nextSubject);
    if (nextDifficulty && ["easy", "medium", "hard"].includes(nextDifficulty)) {
      setDifficulty(nextDifficulty);
    }
  }, [searchParams]);

  async function loadRecent() {
    const response = await fetch("/api/quiz", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      setQuizzes(data.quizzes ?? []);
    }
  }

  useEffect(() => {
    void loadRecent();
  }, []);

  async function createQuiz(next?: { topic: string; subject: string; difficulty: string; numQuestions: number }) {
    const payload = next ?? { topic, subject, difficulty, numQuestions };
    setLoading(true);
    const response = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        ...(!next && plannerContext ? { plannerContext } : {})
      })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error ?? "Could not generate quiz");
      return;
    }
    router.push(`/dashboard/quiz/${data.quizId}`);
  }

  const recentQuizzes = useMemo(() => quizzes.slice(0, 5), [quizzes]);

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[28px] p-5 md:p-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Active recall</p>
          <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Generate a Quiz</h3>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {plannerContext ? (
            <div className="md:col-span-2 rounded-[22px] border border-[#F6C27A]/40 bg-[#FFF6E7] px-4 py-3 text-sm text-[#9A5B12]">
              This quiz is linked to your planner. Score 50% or more to clear the chapter automatically.
            </div>
          ) : null}
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Topic</label>
            <Input
              id="quiz-topic-input"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Enter the topic you just studied"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Subject</label>
            <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Difficulty</label>
            <div id="quiz-difficulty-selector" className="flex flex-wrap gap-2">
              {[
                ["easy", "Easy"],
                ["medium", "Medium"],
                ["hard", "Hard"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDifficulty(value)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    difficulty === value
                      ? "border-transparent bg-[#7B6CF6] text-white shadow-[0_10px_18px_rgba(123,108,246,0.24)]"
                      : "surface-pill text-[var(--muted-foreground)]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Number of questions</label>
            <div className="flex flex-wrap gap-2">
              {QUESTION_COUNTS.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setNumQuestions(count)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    numQuestions === count
                      ? "border-transparent bg-[#7B6CF6] text-white shadow-[0_10px_18px_rgba(123,108,246,0.24)]"
                      : "surface-pill text-[var(--muted-foreground)]"
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={() => void createQuiz()} disabled={loading || !topic.trim()}>
            {loading ? "Generating..." : "Generate Quiz"}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">History</p>
          <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Recent Quizzes</h3>
        </div>

        <div className="space-y-3">
          {recentQuizzes.length === 0 ? (
            <div className="glass-card rounded-[24px] p-5 text-sm text-[var(--muted-foreground)]">No quiz attempts yet.</div>
          ) : (
            recentQuizzes.map((quiz) => (
              <div key={quiz._id} className="glass-card flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{quiz.topic}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    {quiz.subject}
                    {quiz.completedAt ? ` • ${new Date(quiz.completedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {quiz.score !== null ? (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        quiz.score >= 80
                          ? "bg-[#6EE7B7]/18 text-[#047857]"
                          : quiz.score >= 60
                            ? "bg-[#FCD34D]/18 text-[#A16207]"
                            : "bg-[#FCA5A5]/18 text-[#B91C1C]"
                      )}
                    >
                      {quiz.score}%
                    </span>
                  ) : null}
                  <Button
                    variant="outline"
                    onClick={() =>
                      void createQuiz({
                        topic: quiz.topic,
                        subject: quiz.subject,
                        difficulty: "medium",
                        numQuestions: Math.min(Math.max(quiz.totalQuestions || 10, 5), 20)
                      })
                    }
                  >
                    Retake
                  </Button>
                  {quiz.score !== null && quiz.score < 80 ? (
                    <Button variant="outline" onClick={() => router.push(`/dashboard/quiz/${quiz._id}/autopsy`)}>
                      View Autopsy
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

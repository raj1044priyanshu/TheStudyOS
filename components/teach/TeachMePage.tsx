"use client";

import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import Link from "next/link";
import toast from "react-hot-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SUBJECTS } from "@/lib/constants";
import { triggerAchievementCheck } from "@/lib/client-achievements";
import { cn } from "@/lib/utils";

interface SessionSummary {
  _id: string;
  topic: string;
  subject: string;
  understandingScore: number;
  correctPoints: string[];
  missedPoints: string[];
  misconceptions: Array<{ text: string; correction: string }>;
  aiSimplifiedExplanation: string;
  encouragement?: string;
  createdAt: string;
}

interface EvaluationPayload {
  understandingScore: number;
  correctPoints: string[];
  missedPoints: string[];
  misconceptions: Array<{ text: string; correction: string }>;
  aiSimplifiedExplanation: string;
  encouragement?: string;
  previousScore?: number | null;
  improvementDelta?: number | null;
}

export function TeachMePage() {
  const [subject, setSubject] = useState("Mathematics");
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [result, setResult] = useState<EvaluationPayload | null>(null);

  async function loadHistory() {
    const response = await fetch("/api/teach-me", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setSessions(data.sessions ?? []);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const charCount = useMemo(() => explanation.trim().length, [explanation]);
  const scoreColor = result
    ? result.understandingScore < 40
      ? "#EF4444"
      : result.understandingScore < 70
        ? "#F59E0B"
        : "#34D399"
    : "#7B6CF6";

  async function submit() {
    if (charCount < 50) {
      toast.error("Please write at least a sentence or two about the topic.");
      return;
    }
    setLoading(true);
    const response = await fetch("/api/teach-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, subject, explanation })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error ?? "Could not evaluate this explanation");
      return;
    }
    setResult(data.evaluation);
    void loadHistory();
    void triggerAchievementCheck("teachme_completed");
    if (data.evaluation?.understandingScore === 100) {
      void confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_280px]">
      <div className="space-y-5">
        {!result ? (
          <>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Feynman Technique</p>
              <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Teach Me</h2>
              <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
                Explain it simply. If you can’t explain it simply, you don’t understand it yet.
              </p>
            </div>

            <div className="glass-card space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Subject</label>
                  <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
                    {SUBJECTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Topic</label>
                  <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Photosynthesis" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Your explanation</label>
                <Textarea
                  value={explanation}
                  onChange={(event) => setExplanation(event.target.value)}
                  placeholder="Imagine you're explaining this to a 10-year-old who has never heard of it. Use your own words. No copying from textbooks. Just explain what you know..."
                  className={`min-h-[220px] ${charCount < 50 ? "animate-[pulse_1.2s_ease-in-out_infinite]" : ""}`}
                />
                <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">{charCount} characters</p>
              </div>

              <Button onClick={submit} disabled={loading || !topic.trim() || charCount < 50}>
                {loading ? "Evaluating your explanation..." : "📤 Submit Explanation"}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-5">
            {typeof result.improvementDelta === "number" && result.improvementDelta > 0 ? (
              <div className="rounded-[22px] bg-[#34D399]/12 px-5 py-4 text-sm font-medium text-[#0F766E]">
                🎉 You improved by {result.improvementDelta} points!
              </div>
            ) : null}

            {result.understandingScore < 20 ? (
              <div className="rounded-[22px] bg-[#FCD34D]/18 px-5 py-4 text-sm text-[#92400E]">
                This topic is still shaky, which is okay. Read the note version first, then try teaching it again in your own words.
              </div>
            ) : null}

            <div className="glass-card grid gap-5 p-6 md:grid-cols-[220px_1fr]">
              <div className="relative flex h-44 w-44 items-center justify-center justify-self-center">
                <svg viewBox="0 0 160 160" className="h-44 w-44 -rotate-90">
                  <circle cx="80" cy="80" r="64" stroke="rgba(148,163,184,0.22)" strokeWidth="10" fill="none" />
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    stroke={scoreColor}
                    strokeWidth="10"
                    fill="none"
                    strokeDasharray={402}
                    strokeDashoffset={402 - (402 * result.understandingScore) / 100}
                  />
                </svg>
                <div className="absolute text-center">
                  <p className="font-headline text-[3.4rem] leading-none text-[var(--foreground)]">{result.understandingScore}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Understanding Score</p>
                </div>
              </div>

              <div>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">{result.encouragement ?? "Encouragingly honest feedback, tuned for faster revision."}</p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResult(null);
                      setExplanation("");
                    }}
                  >
                    🔄 Try Again
                  </Button>
                  <Link
                    href={`/notes?topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject)}`}
                    className={cn(buttonVariants({ variant: "default" }))}
                  >
                    📝 Generate Full Notes on This Topic
                  </Link>
                </div>
              </div>
            </div>

            <details className="glass-card rounded-[24px] p-5" open>
              <summary className="cursor-pointer text-lg font-semibold text-[#10B981]">✅ What You Got Right</summary>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--foreground)]">
                {(result.correctPoints.length ? result.correctPoints : ["You didn't quite hit the key points yet."]).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </details>

            <details className="glass-card rounded-[24px] p-5" open>
              <summary className="cursor-pointer text-lg font-semibold text-[#EF4444]">❌ What You Missed</summary>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--foreground)]">
                {(result.missedPoints.length ? result.missedPoints : ["Great coverage!"]).map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </details>

            <details className="glass-card rounded-[24px] p-5" open>
              <summary className="cursor-pointer text-lg font-semibold text-[#F59E0B]">⚠️ Misconceptions to Fix</summary>
              <div className="mt-4 space-y-3">
                {result.misconceptions.length ? (
                  result.misconceptions.map((item, index) => (
                    <div key={`${item.text}-${index}`} className="rounded-[18px] border border-[color:var(--panel-border)] p-4">
                      <p className="text-sm text-[#B91C1C] line-through">{item.text}</p>
                      <p className="mt-2 text-sm leading-6 text-[#047857]">{item.correction}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]">No misconceptions found!</p>
                )}
              </div>
            </details>

            <details className="glass-card rounded-[24px] p-5" open>
              <summary className="cursor-pointer text-lg font-semibold text-[#7B6CF6]">🧠 The Simple Explanation</summary>
              <p className="mt-4 text-sm leading-7 text-[var(--foreground)]">{result.aiSimplifiedExplanation}</p>
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">Compare this with what you wrote and notice the gaps in structure, accuracy, and clarity.</p>
            </details>
          </div>
        )}
      </div>

      <aside className="glass-card h-fit space-y-4 p-4">
        <p className="text-sm font-semibold text-[var(--foreground)]">Past Sessions</p>
        {sessions.slice(0, 5).map((session) => (
          <button
            key={session._id}
            type="button"
            onClick={() =>
              setResult({
                understandingScore: session.understandingScore,
                correctPoints: session.correctPoints,
                missedPoints: session.missedPoints,
                misconceptions: session.misconceptions,
                aiSimplifiedExplanation: session.aiSimplifiedExplanation,
                encouragement: session.encouragement ?? ""
              })
            }
            className="surface-card block w-full rounded-[20px] p-4 text-left"
          >
            <p className="font-semibold text-[var(--foreground)]">{session.topic}</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">{session.subject}</p>
            <span className="mt-3 inline-flex rounded-full bg-[#7B6CF6]/12 px-2.5 py-1 text-xs font-medium text-[#7B6CF6]">
              Score {session.understandingScore}
            </span>
          </button>
        ))}
      </aside>
    </div>
  );
}

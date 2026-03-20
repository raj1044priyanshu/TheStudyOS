"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SUBJECTS } from "@/lib/constants";
import toast from "react-hot-toast";

export default function QuizStartPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [difficulty, setDifficulty] = useState("medium");
  const [numQuestions, setNumQuestions] = useState(10);
  const [loading, setLoading] = useState(false);

  function useExample() {
    setTopic("Trigonometry basics");
    setSubject("Mathematics");
    setDifficulty("medium");
    setNumQuestions(8);
  }

  async function createQuiz() {
    setLoading(true);
    const response = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, subject, difficulty, numQuestions })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.error("Could not generate quiz");
      return;
    }
    router.push(`/quiz/${data.quizId}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Assessment</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Quiz</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Choose a topic, subject, difficulty, and question count to begin a focused single-question quiz flow.
        </p>
      </div>

      <div data-tour-id="quiz-setup-card" className="glass-card max-w-4xl p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Setup</p>
            <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Create a quiz</h3>
          </div>
          <Button data-tour-id="quiz-example-fill" type="button" variant="ghost" size="sm" onClick={useExample}>
            Use Example
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input
            data-tour-id="quiz-topic-input"
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Topic"
            className="md:col-span-2"
          />
          <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
            {SUBJECTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>
          <Input type="number" min={1} max={20} value={numQuestions} onChange={(event) => setNumQuestions(Number(event.target.value))} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["Single-question focus", "One question at a time with instant selection feedback."],
            ["Progress-aware", "Scores feed your progress dashboard and quiz history."],
            ["Real tracking", "Submission still updates streak, XP, and achievements."]
          ].map(([title, desc]) => (
            <div key={title} className="surface-card rounded-[18px] px-4 py-3 text-sm leading-6 text-[var(--muted-foreground)]">
              <span className="font-medium text-[var(--foreground)]">{title}</span> {desc}
            </div>
          ))}
        </div>

        <Button data-tour-id="quiz-start-button" className="mt-5" onClick={createQuiz} disabled={loading || !topic.trim()}>
          {loading ? "Generating..." : "Start Quiz"}
        </Button>
      </div>
    </div>
  );
}

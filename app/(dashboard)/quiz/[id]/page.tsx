"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { QuizQuestion } from "@/types";
import { QuizCard } from "@/components/quiz/QuizCard";
import { QuizResults } from "@/components/quiz/QuizResults";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";

interface QuizDoc {
  _id: string;
  subject: string;
  topic: string;
  questions: QuizQuestion[];
}

export default function QuizPlayPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, "A" | "B" | "C" | "D">>({});
  const [submitted, setSubmitted] = useState(false);
  const [finalScore, setFinalScore] = useState<{ score: number; total: number } | null>(null);
  const [startedAt] = useState(Date.now());

  useEffect(() => {
    async function load() {
      const response = await fetch(`/api/quiz/${params.id}`);
      const data = await response.json();
      if (!response.ok) {
        toast.error("Quiz not found");
        router.push("/quiz");
        return;
      }
      setQuiz(data.quiz);
      setLoading(false);
    }
    void load();
  }, [params.id, router]);

  const score = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.reduce((acc, question, idx) => (answers[idx] === question.correct ? acc + 1 : acc), 0);
  }, [quiz, answers]);

  if (loading || !quiz) {
    return <LoadingSpinner text="Loading quiz..." />;
  }

  const quizData = quiz;
  const question = quizData.questions[currentIndex];

  async function answer(option: "A" | "B" | "C" | "D") {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [currentIndex]: option }));

    if (currentIndex < quizData.questions.length - 1) {
      setTimeout(() => setCurrentIndex((value) => value + 1), 400);
    }
  }

  async function finish() {
    const orderedAnswers = quizData.questions.map((_, index) => answers[index] ?? null);
    const response = await fetch("/api/quiz", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId: quizData._id,
        answers: orderedAnswers,
        timeTaken: Math.round((Date.now() - startedAt) / 1000 / 60),
        subject: quizData.subject
      })
    });

    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not submit quiz");
      return;
    }

    if (data.events?.levelUp?.happened) {
      toast.success(`Level ${data.events.levelUp.to} unlocked`);
    }
    if (data.events?.streakUpdated?.current > data.events?.streakUpdated?.previous) {
      toast.success("Streak increased");
    }
    if (data.events?.streakMilestone?.happened && data.events?.streakMilestone?.milestone) {
      toast.success(`${data.events.streakMilestone.milestone}-day streak reached`);
    }
    for (const achievement of data.events?.newAchievements ?? []) {
      toast.success(`Achievement unlocked: ${achievement.title}`);
    }

    setFinalScore({
      score: data.result?.correctCount ?? score,
      total: data.result?.totalQuestions ?? quizData.questions.length
    });
    setSubmitted(true);
    window.dispatchEvent(new CustomEvent("tour:quiz-submitted"));
  }

  if (submitted) {
    return (
      <QuizResults
        score={finalScore?.score ?? score}
        total={finalScore?.total ?? quizData.questions.length}
        onRetry={() => {
          setAnswers({});
          setCurrentIndex(0);
          setFinalScore(null);
          setSubmitted(false);
        }}
        onNewQuiz={() => {
          window.dispatchEvent(new CustomEvent("tour:quiz-returned"));
          router.push("/quiz");
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <QuizCard
        question={question}
        index={currentIndex}
        total={quizData.questions.length}
        onAnswer={answer}
        selected={answers[currentIndex]}
        showResult={Boolean(answers[currentIndex])}
      />
      <div className="mx-auto max-w-4xl">
        <Button data-tour-id="quiz-submit-button" onClick={finish}>
        Submit Quiz
        </Button>
      </div>
    </div>
  );
}

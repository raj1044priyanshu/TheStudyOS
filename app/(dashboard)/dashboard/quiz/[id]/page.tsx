"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { QuizCard } from "@/components/quiz/QuizCard";
import { QuizResults } from "@/components/quiz/QuizResults";
import { queueCelebrationsFromGamification } from "@/lib/client-celebrations";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { QuizQuestion } from "@/types";

interface QuizDoc {
  _id: string;
  subject: string;
  topic: string;
  questions: QuizQuestion[];
}

export default function DashboardQuizPlayPage({ params }: { params: { id: string } }) {
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
        router.push("/dashboard/test?tool=quiz");
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

  function answer(option: "A" | "B" | "C" | "D") {
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

    if (data.plannerCheckpoint?.passed) {
      toast.success("Planner chapter cleared.");
    } else if (data.plannerCheckpoint) {
      toast.error("Planner chapter still needs work. Revise and retry in Test.");
    }

    setFinalScore({
      score: data.result?.correctCount ?? score,
      total: data.result?.totalQuestions ?? quizData.questions.length
    });
    queueCelebrationsFromGamification(data.events, "quiz");
    setSubmitted(true);
  }

  async function handleNextAction(action: "schedule_revision" | "convert_scan" | "improve_answer" | "open_practice") {
    if (action !== "schedule_revision") {
      return;
    }

    const response = await fetch("/api/revision/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: quizData.topic,
        subject: quizData.subject,
        type: "quiz",
        sourceId: quizData._id,
        sourceTitle: `${quizData.topic} quiz`
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? "Could not add this to revision");
      return;
    }
    toast.success("Added to revision queue");
  }

  if (submitted) {
    return (
      <QuizResults
        score={finalScore?.score ?? score}
        total={finalScore?.total ?? quizData.questions.length}
        quizId={quizData._id}
        topic={quizData.topic}
        subject={quizData.subject}
        onRetry={() => {
          setAnswers({});
          setCurrentIndex(0);
          setFinalScore(null);
          setSubmitted(false);
        }}
        onViewAutopsy={() => router.push(`/dashboard/quiz/${quizData._id}/autopsy`)}
        onNextAction={handleNextAction}
        onNewQuiz={() => router.push("/dashboard/test?tool=quiz")}
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
        <Button onClick={() => void finish()}>Submit Quiz</Button>
      </div>
    </div>
  );
}

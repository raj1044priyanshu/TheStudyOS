"use client";

import { useEffect, useMemo, useState } from "react";
import { IconBrain, IconCards, IconFileCheck, IconFileSearch, IconMicroscope, IconPercentage } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { QuizPanel } from "@/components/test/QuizPanel";
import { FlashcardsPanel } from "@/components/flashcards/FlashcardsPanel";
import { TeachMePage } from "@/components/teach/TeachMePage";
import { EvaluatorPage } from "@/components/evaluator/EvaluatorPage";
import { PastPapersPage } from "@/components/past-papers/PastPapersPage";

interface FlashcardDeckSummary {
  _id: string;
  topic: string;
  subject: string;
  cards: Array<{ front: string; back: string; difficulty: "easy" | "medium" | "hard" }>;
  createdAt: string;
}

interface Props {
  initialDecks: FlashcardDeckSummary[];
}

export function TestHubPage({ initialDecks }: Props) {
  const [quizCount, setQuizCount] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [pendingAutopsies, setPendingAutopsies] = useState(0);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/quiz", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        quizzes?: Array<{ score: number | null; hasAutopsy: boolean }>;
      };

      const quizzes = data.quizzes ?? [];
      const scored = quizzes.filter((quiz) => quiz.score !== null);
      const avg = scored.length
        ? Math.round(scored.reduce((total, quiz) => total + (quiz.score ?? 0), 0) / scored.length)
        : 0;

      setQuizCount(quizzes.length);
      setAverageScore(avg);
      setPendingAutopsies(quizzes.filter((quiz) => quiz.score !== null && quiz.score < 80 && !quiz.hasAutopsy).length);
    }

    void load();
  }, []);

  const stats = useMemo(
    () => [
      { icon: IconBrain, label: `${quizCount} quizzes taken` },
      { icon: IconPercentage, label: `${averageScore}% average score` },
      { icon: IconMicroscope, label: `${pendingAutopsies} autopsies pending` }
    ],
    [averageScore, pendingAutopsies, quizCount]
  );

  return (
    <HubLayout
      phase="test"
      title="Test"
      subtitle="Active recall is one of the strongest ways to make learning stick. Test yourself on everything you study."
      stats={stats}
      defaultTab="quiz"
      tabs={[
        { id: "quiz", icon: IconBrain, label: "Quiz", component: <QuizPanel /> },
        { id: "flashcards", icon: IconCards, label: "Flashcards", component: <FlashcardsPanel initialDecks={initialDecks} /> },
        { id: "teach-me", icon: IconMicroscope, label: "Teach Me", component: <TeachMePage /> },
        { id: "evaluator", icon: IconFileCheck, label: "Evaluator", component: <EvaluatorPage /> },
        { id: "past-papers", icon: IconFileSearch, label: "Past Papers", component: <PastPapersPage /> }
      ]}
    />
  );
}

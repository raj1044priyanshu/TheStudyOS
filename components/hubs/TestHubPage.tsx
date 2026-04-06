"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { IconBrain, IconCards, IconFileCheck, IconFileSearch, IconMicroscope, IconPercentage } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { HubPanelFallback } from "@/components/layout/HubPanelFallback";

const QuizPanel = dynamic(() => import("@/components/test/QuizPanel").then((mod) => mod.QuizPanel), {
  loading: () => <HubPanelFallback text="Loading quiz tools..." />
});
const FlashcardsPanel = dynamic(() => import("@/components/flashcards/FlashcardsPanel").then((mod) => mod.FlashcardsPanel), {
  loading: () => <HubPanelFallback text="Loading flashcards..." />
});
const TeachMePage = dynamic(() => import("@/components/teach/TeachMePage").then((mod) => mod.TeachMePage), {
  loading: () => <HubPanelFallback text="Loading teach-me mode..." />
});
const EvaluatorPage = dynamic(() => import("@/components/evaluator/EvaluatorPage").then((mod) => mod.EvaluatorPage), {
  loading: () => <HubPanelFallback text="Loading evaluator..." />
});
const PastPapersPage = dynamic(() => import("@/components/past-papers/PastPapersPage").then((mod) => mod.PastPapersPage), {
  loading: () => <HubPanelFallback text="Loading past papers..." />
});

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
        {
          id: "quiz",
          icon: IconBrain,
          label: "Quiz",
          description: "Generate topic quizzes, finish them quickly, and spot where recall is starting to slip.",
          component: <QuizPanel />
        },
        {
          id: "flashcards",
          icon: IconCards,
          label: "Flashcards",
          description: "Review short facts and definitions in compact, repeatable bursts.",
          component: <FlashcardsPanel initialDecks={initialDecks} />
        },
        {
          id: "teach-me",
          icon: IconMicroscope,
          label: "Teach Me",
          description: "Explain a topic in your own words and see whether understanding is actually solid.",
          component: <TeachMePage />
        },
        {
          id: "evaluator",
          icon: IconFileCheck,
          label: "Evaluator",
          description: "Submit a longer answer and get focused feedback on what to improve next.",
          component: <EvaluatorPage />
        },
        {
          id: "past-papers",
          icon: IconFileSearch,
          label: "Past Papers",
          description: "Use previous papers to spot patterns, likely topics, and follow-up practice opportunities.",
          component: <PastPapersPage />
        }
      ]}
    />
  );
}

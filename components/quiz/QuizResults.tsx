import { Button } from "@/components/ui/button";
import { NextStepCard } from "@/components/shared/NextStepCard";
import { getHubHref } from "@/lib/hubs";

interface Props {
  score: number;
  total: number;
  topic?: string;
  subject?: string;
  quizId?: string;
  onRetry: () => void;
  onNewQuiz: () => void;
  onViewAutopsy?: () => void;
  onNextAction?: (action: "schedule_revision" | "convert_scan" | "improve_answer" | "open_practice") => void | Promise<void>;
}

export function QuizResults({ score, total, topic, subject, quizId, onRetry, onNewQuiz, onViewAutopsy, onNextAction }: Props) {
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  const grade = percent >= 90 ? "A+" : percent >= 75 ? "A" : percent >= 60 ? "B" : percent >= 45 ? "C" : "D";
  const suggestions =
    percent >= 80
      ? [
          {
            icon: "",
            title: "Schedule this for revision",
            description: "You know this well. Let spaced repetition keep it in long-term memory.",
            action: "schedule_revision" as const
          },
          {
            icon: "",
            title: "Try explaining it without notes",
            description: "A quick Teach Me round will confirm whether this is real understanding or recognition.",
            href: topic
              ? `${getHubHref("test", "teach-me")}&topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject ?? "")}`
              : getHubHref("test", "teach-me")
          }
        ]
      : [
          {
            icon: "",
            title: "View your Exam Autopsy",
            description: "Find out exactly why you got those wrong.",
            href: quizId ? `/dashboard/quiz/${quizId}/autopsy` : getHubHref("test", "quiz")
          },
          {
            icon: "",
            title: "Re-read your notes on this topic",
            description: "Go back to the exact topic before taking another quiz.",
            href: topic
              ? `${getHubHref("study", "notes")}&topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject ?? "")}`
              : getHubHref("study", "notes")
          }
        ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="glass-card p-8 text-center md:p-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Results</p>
        <h3 className="mt-2 font-headline text-5xl tracking-[-0.04em] text-[var(--foreground)]">Quiz Completed</h3>
        <p className="mt-4 text-lg text-[var(--foreground)]">
          Score: {score}/{total} ({percent}%)
        </p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Grade: {grade}</p>
        {percent < 50 && topic ? (
          <div className="mt-4 rounded-[20px] bg-[#FCD34D]/18 px-4 py-3 text-sm text-[#92400E]">
            Score under 50%? Try Teach Me Mode on this topic. Explaining it forces you to find where your understanding breaks down.
          </div>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button data-tour-id="quiz-retry-button" variant="outline" onClick={onRetry}>
            Retry
          </Button>
          {onViewAutopsy ? (
            <Button id="autopsy-btn" onClick={onViewAutopsy}>
              View Autopsy
            </Button>
          ) : null}
          <Button data-tour-id="quiz-new-button" onClick={onNewQuiz}>
            New Quiz
          </Button>
          {percent < 50 && topic ? (
            <a href={`${getHubHref("test", "teach-me")}&topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject ?? "")}`}>
              <Button variant="outline">Try Teach Me</Button>
            </a>
          ) : null}
        </div>
      </div>
      <NextStepCard suggestions={suggestions} onAction={onNextAction} />
    </div>
  );
}

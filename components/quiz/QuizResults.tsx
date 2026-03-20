import { Button } from "@/components/ui/button";

interface Props {
  score: number;
  total: number;
  onRetry: () => void;
  onNewQuiz: () => void;
}

export function QuizResults({ score, total, onRetry, onNewQuiz }: Props) {
  const percent = total === 0 ? 0 : Math.round((score / total) * 100);
  const grade = percent >= 90 ? "A+" : percent >= 75 ? "A" : percent >= 60 ? "B" : percent >= 45 ? "C" : "D";

  return (
    <div className="glass-card mx-auto max-w-3xl p-8 text-center md:p-10">
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Results</p>
      <h3 className="mt-2 font-headline text-5xl tracking-[-0.04em] text-[var(--foreground)]">Quiz Completed</h3>
      <p className="mt-4 text-lg text-[var(--foreground)]">
        Score: {score}/{total} ({percent}%)
      </p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Grade: {grade}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button data-tour-id="quiz-retry-button" variant="outline" onClick={onRetry}>
          Retry
        </Button>
        <Button data-tour-id="quiz-new-button" onClick={onNewQuiz}>
          New Quiz
        </Button>
      </div>
    </div>
  );
}

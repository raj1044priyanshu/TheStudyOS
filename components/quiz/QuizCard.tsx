import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import type { QuizQuestion } from "@/types";

interface Props {
  question: QuizQuestion;
  index: number;
  total: number;
  onAnswer: (value: "A" | "B" | "C" | "D") => void;
  selected?: "A" | "B" | "C" | "D";
  showResult?: boolean;
}

export function QuizCard({ question, index, total, onAnswer, selected, showResult }: Props) {
  return (
    <div className="glass-card mx-auto max-w-4xl p-6 md:p-8">
      <Progress value={((index + 1) / total) * 100} className="mb-5" />
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">
        Question {index + 1} / {total}
      </p>
      <h3 className="mb-6 font-headline text-4xl leading-tight tracking-[-0.03em] text-[var(--foreground)] md:text-5xl">{question.question}</h3>
      <div className="grid gap-3">
        {(["A", "B", "C", "D"] as const).map((option) => {
          const correct = question.correct === option;
          const isSelected = selected === option;
          const stateClass = showResult
            ? correct
              ? "border-[#6EE7B7] bg-[#6EE7B7]/22 text-[#0F766E]"
              : isSelected
                ? "border-[#FCA5A5] bg-[#FCA5A5]/22 text-[#B91C1C]"
                : "border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] text-[var(--foreground)]"
            : isSelected
              ? "border-[#7B6CF6] bg-[#7B6CF6]/10 text-[#5748d1] dark:text-[#D9D3FF]"
              : "border-[color:var(--panel-border)] bg-[color:var(--surface-panel)] text-[var(--foreground)] hover:border-[color:var(--secondary-button-border)] hover:bg-[color:var(--surface-panel-hover)]";
          return (
            <Button
              key={option}
              data-tour-id={option === "A" ? "quiz-option-a" : undefined}
              variant="outline"
              className={`min-h-16 justify-start rounded-[18px] px-4 py-4 text-left ${stateClass}`}
              onClick={() => {
                window.dispatchEvent(new CustomEvent("tour:quiz-answered"));
                onAnswer(option);
              }}
            >
              <span className="surface-icon-muted mr-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium text-[inherit]">
                {option}
              </span>
              <span className="whitespace-normal">{question.options[option]}</span>
            </Button>
          );
        })}
      </div>
      {showResult ? (
        <div className="surface-card mt-5 rounded-[18px] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
          {question.explanation}
        </div>
      ) : null}
    </div>
  );
}

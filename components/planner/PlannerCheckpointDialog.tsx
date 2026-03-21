"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PlannerCheckpointSummary, PlannerDetails } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  planId: string;
  date: string;
  taskIndex: number;
  subject: string;
  chapter: string;
  board?: string;
  className?: string;
  stream?: string;
  onPlanUpdated: (plan: PlannerDetails) => void;
}

export function PlannerCheckpointDialog({
  open,
  onClose,
  planId,
  date,
  taskIndex,
  subject,
  chapter,
  board,
  className,
  stream,
  onPlanUpdated
}: Props) {
  const [checkpoint, setCheckpoint] = useState<PlannerCheckpointSummary | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    async function loadCheckpoint() {
      setLoading(true);
      const response = await fetch("/api/planner/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, date, taskIndex, board, className, stream })
      });
      const data = await response.json().catch(() => ({}));
      setLoading(false);

      if (!response.ok) {
        toast.error(data.error ?? "Could not open checkpoint");
        return;
      }

      setCheckpoint(data.checkpoint ?? null);
      setAnswers(Array.from({ length: data.checkpoint?.questions?.length ?? 0 }, () => ""));
    }

    void loadCheckpoint();
  }, [board, className, date, open, planId, stream, taskIndex]);

  const canSubmit = useMemo(() => answers.some((answer) => answer.trim().length > 0), [answers]);

  async function submitCheckpoint() {
    if (!checkpoint) {
      return;
    }

    setSubmitting(true);
    const response = await fetch("/api/planner/checkpoint", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkpointId: checkpoint._id,
        answers,
        subject
      })
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      toast.error(data.error ?? "Could not evaluate checkpoint");
      return;
    }

    setCheckpoint(data.checkpoint ?? checkpoint);
    if (data.selectedPlan) {
      onPlanUpdated(data.selectedPlan);
    }

    if (data.checkpoint?.passed) {
      toast.success(`Checkpoint passed with ${data.checkpoint.score}%`);
    } else {
      toast.error(`Checkpoint score ${data.checkpoint?.score ?? 0}%. Revise the chapter and try again.`);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`${subject}: ${chapter}`}
      description="Pass this checkpoint with 50% or more to unlock chapter completion."
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => void submitCheckpoint()} disabled={!checkpoint || !canSubmit || submitting}>
            {submitting ? "Evaluating..." : "Submit checkpoint"}
          </Button>
        </div>
      }
    >
      {loading ? <p className="text-sm text-[var(--muted-foreground)]">Preparing your checkpoint...</p> : null}

      {!loading && checkpoint ? (
        <div className="space-y-5">
          {checkpoint.status === "submitted" ? (
            <div className={`rounded-[22px] border p-4 text-sm ${checkpoint.passed ? "border-[#6EE7B7]/50 bg-[#6EE7B7]/12" : "border-[#FCA5A5]/45 bg-[#FCA5A5]/10"}`}>
              <p className="font-medium text-[var(--foreground)]">
                Score: {checkpoint.score}% {checkpoint.passed ? "• Passed" : "• Needs revision"}
              </p>
              {checkpoint.feedback.length ? (
                <div className="mt-3 space-y-2 text-[var(--muted-foreground)]">
                  {checkpoint.feedback.map((item) => (
                    <p key={item}>{item}</p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {checkpoint.questions.map((question, index) => (
            <div key={`${question.prompt}-${index}`} className="surface-card rounded-[22px] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">
                {question.type.replace("_", " ")} • {question.maxMarks} marks
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-[var(--foreground)]">{question.prompt}</p>

              {question.type === "objective" && question.options?.length ? (
                <div className="mt-3 space-y-2">
                  {question.options.map((option) => (
                    <label key={option} className="flex items-center gap-3 rounded-[18px] border border-[color:var(--panel-border)] px-3 py-3 text-sm">
                      <input
                        type="radio"
                        name={`checkpoint-${index}`}
                        checked={answers[index] === option}
                        onChange={() => setAnswers((previous) => previous.map((item, itemIndex) => (itemIndex === index ? option : item)))}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {question.type === "fill_blank" || question.type === "numerical" ? (
                <div className="mt-3">
                  <Input
                    value={answers[index] ?? ""}
                    onChange={(event) =>
                      setAnswers((previous) => previous.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                    }
                    placeholder="Write your answer"
                  />
                </div>
              ) : null}

              {(question.type === "short" || question.type === "long") ? (
                <div className="mt-3">
                  <Textarea
                    value={answers[index] ?? ""}
                    onChange={(event) =>
                      setAnswers((previous) => previous.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))
                    }
                    placeholder="Write your answer"
                    className={question.type === "long" ? "min-h-[160px]" : "min-h-[110px]"}
                  />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { SUBJECTS } from "@/lib/constants";
import { triggerAchievementCheck } from "@/lib/client-achievements";

interface EvaluationRecord {
  _id: string;
  subject: string;
  question: string;
  studentAnswer: string;
  examBoard: string;
  maxMarks: number;
  totalObtained: number;
  totalMax: number;
  feedback: string[];
  improvedAnswer?: string | null;
  scores: {
    content: { obtained: number; max: number; comment?: string };
    structure: { obtained: number; max: number; comment?: string };
    language: { obtained: number; max: number; comment?: string };
    examples: { obtained: number; max: number; comment?: string };
    conclusion: { obtained: number; max: number; comment?: string };
  };
  grade?: string;
  createdAt?: string;
}

const EMPTY_FORM = {
  subject: "Mathematics",
  examBoard: "CBSE",
  question: "",
  maxMarks: 10,
  answer: ""
};

export function EvaluatorPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [improving, setImproving] = useState(false);
  const [evaluation, setEvaluation] = useState<EvaluationRecord | null>(null);
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const [improvedAnswer, setImprovedAnswer] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  async function loadHistory() {
    const response = await fetch("/api/evaluator", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setHistory(data.evaluations ?? []);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  const wordCount = useMemo(() => form.answer.trim().split(/\s+/).filter(Boolean).length, [form.answer]);
  const percentage = evaluation ? Math.round((evaluation.totalObtained / Math.max(1, evaluation.totalMax)) * 100) : 0;
  const scoreColor = percentage >= 80 ? "#34D399" : percentage >= 60 ? "#F59E0B" : "#EF4444";

  async function submit() {
    setLoading(true);
    const response = await fetch("/api/evaluator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, wordCount })
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      toast.error(data.error ?? "Could not evaluate this answer");
      return;
    }
    setEvaluation(data.evaluation);
    void loadHistory();
    void triggerAchievementCheck("evaluation_completed");
  }

  async function improveAnswer() {
    if (!evaluation) return;
    setImproving(true);
    const response = await fetch(`/api/evaluator/${evaluation._id}/improve`, { method: "POST" });
    const data = await response.json();
    setImproving(false);
    if (!response.ok) {
      toast.error(data.error ?? "Could not improve this answer");
      return;
    }
    setImprovedAnswer(data.improvedAnswer ?? "");
    setModalOpen(true);
  }

  async function saveAsNote() {
    if (!evaluation) return;
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: evaluation.subject,
        topic: evaluation.question.slice(0, 60),
        class: "Exam Practice",
        detailLevel: "standard",
        style: "classic"
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.error(data.error ?? "Could not save as note");
      return;
    }
    toast.success("Saved as a StudyOS note");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Exam Practice</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Evaluator</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Submit a long-form answer, see where marks were lost, and request a stronger rewrite when you want to compare against a higher-scoring version.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="glass-card space-y-4 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}>
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Input value={form.examBoard} onChange={(event) => setForm((prev) => ({ ...prev, examBoard: event.target.value }))} placeholder="CBSE / ICSE / IB" />
          </div>
          <Textarea value={form.question} onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))} placeholder="Exam question" className="min-h-[90px]" />
          <Input
            type="number"
            min={1}
            max={100}
            value={form.maxMarks}
            onChange={(event) => setForm((prev) => ({ ...prev, maxMarks: Number(event.target.value) }))}
          />
          <div>
            <Textarea
              value={form.answer}
              onChange={(event) => setForm((prev) => ({ ...prev, answer: event.target.value }))}
              placeholder="Write your answer here..."
              className="min-h-[320px]"
            />
            <p className="mt-2 text-right text-xs text-[var(--muted-foreground)]">{wordCount} words</p>
          </div>
          <Button onClick={submit} disabled={loading || form.answer.trim().length < 100 || form.maxMarks < 1 || form.maxMarks > 100}>
            📊 Evaluate My Answer
          </Button>
        </div>

        <div className="glass-card p-6">
          {evaluation ? (
            <div className="space-y-5">
              <div className="rounded-[24px] border border-[color:var(--panel-border)] p-5 text-center">
                <p className="font-headline text-[4rem] leading-none" style={{ color: scoreColor }}>
                  {evaluation.totalObtained}/{evaluation.totalMax}
                </p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">Grade {evaluation.grade ?? "—"}</p>
              </div>

              <div className="space-y-3">
                {Object.entries(evaluation.scores).map(([key, value]) => (
                  <div key={key} className="surface-card rounded-[20px] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium capitalize text-[var(--foreground)]">{key}</p>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        {value.obtained}/{value.max}
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[color:var(--surface-low)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#7B6CF6,#6EE7B7)]"
                        style={{ width: `${Math.max(0, Math.min(100, (value.obtained / Math.max(1, value.max)) * 100))}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{value.comment ?? ""}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {evaluation.feedback.map((point, index) => (
                  <div key={`${point}-${index}`} className="surface-card rounded-[20px] p-4 text-sm leading-6 text-[var(--foreground)]">
                    {index + 1}. {point}
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={improveAnswer} disabled={improving || Boolean(evaluation.improvedAnswer)}>
                  ✨ {evaluation.improvedAnswer ? "Improved Answer Ready" : improving ? "Improving..." : "Improve My Answer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEvaluation(null);
                    setImprovedAnswer("");
                  }}
                >
                  🔄 Evaluate Again
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[440px] items-center justify-center text-center text-sm text-[var(--muted-foreground)]">
              Your marks breakdown and targeted feedback will appear here after evaluation.
            </div>
          )}
        </div>
      </div>

      <div className="glass-card p-5">
        <p className="text-sm font-semibold text-[var(--foreground)]">Past Evaluations</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {history.slice(0, 5).map((item) => (
            <button key={item._id} type="button" onClick={() => setEvaluation(item)} className="surface-card rounded-[20px] p-4 text-left">
              <p className="font-semibold text-[var(--foreground)]">{item.subject}</p>
              <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">{item.question}</p>
              <span className="mt-3 inline-flex rounded-full bg-[#7B6CF6]/12 px-2.5 py-1 text-xs font-medium text-[#7B6CF6]">
                {item.totalObtained}/{item.totalMax}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Improved Answer"
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(improvedAnswer);
                toast.success("Copied improved answer");
              }}
            >
              Copy Improved Answer
            </Button>
            <Button onClick={saveAsNote}>Save as Note</Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[22px] border border-[#FCA5A5]/40 bg-[#FCA5A5]/8 p-4">
            <p className="mb-3 text-sm font-semibold text-[#B91C1C]">Original</p>
            <p className="text-sm leading-7 text-[var(--foreground)]">{evaluation?.studentAnswer}</p>
          </div>
          <div className="rounded-[22px] border border-[#34D399]/40 bg-[#34D399]/8 p-4">
            <p className="mb-3 text-sm font-semibold text-[#047857]">Improved</p>
            <p className="text-sm leading-7 text-[var(--foreground)]">{improvedAnswer}</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

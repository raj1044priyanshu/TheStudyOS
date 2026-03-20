"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IconCalendarPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { ExamCard } from "@/components/exams/ExamCard";
import { SUBJECTS } from "@/lib/constants";
import { Select } from "@/components/ui/select";

interface ExamRecord {
  _id: string;
  subject: string;
  examName: string;
  examDate: string;
  board?: string;
  readiness: number;
  daysUntil: number;
  isPast: boolean;
}

const EMPTY_FORM = {
  subject: "Mathematics",
  examName: "",
  examDate: "",
  board: ""
};

export function ExamsPage() {
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    const response = await fetch("/api/exams", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setExams(data.exams ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const upcoming = useMemo(() => exams.filter((exam) => !exam.isPast), [exams]);
  const past = useMemo(() => exams.filter((exam) => exam.isPast), [exams]);

  async function addExam() {
    const response = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, syllabus: [] })
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not save exam");
      return;
    }
    setForm(EMPTY_FORM);
    void load();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Countdown</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Exams</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Track upcoming exams, readiness, and deadlines from one command center instead of juggling dates across tools.
        </p>
      </div>

      <div className="glass-card grid gap-3 p-5 md:grid-cols-4">
        <Select value={form.subject} onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}>
          {SUBJECTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Input value={form.examName} onChange={(event) => setForm((prev) => ({ ...prev, examName: event.target.value }))} placeholder="Exam name" />
        <Input type="date" value={form.examDate} onChange={(event) => setForm((prev) => ({ ...prev, examDate: event.target.value }))} />
        <Input value={form.board} onChange={(event) => setForm((prev) => ({ ...prev, board: event.target.value }))} placeholder="CBSE / ICSE / IB" />
        <Button onClick={addExam} className="md:col-span-4">
          <IconCalendarPlus className="mr-2 h-4 w-4" />
          Add Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          title="No exams yet"
          description="Add your first exam to start tracking countdowns and readiness."
          actionLabel="Add your first exam"
          onAction={() => undefined}
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Upcoming</h3>
            <div className="grid gap-4 xl:grid-cols-2">
              {upcoming.map((exam) => (
                <ExamCard key={exam._id} exam={exam} onDeleted={load} />
              ))}
            </div>
          </section>

          {past.length ? (
            <section className="space-y-4">
              <h3 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Past Exams</h3>
              <div className="grid gap-4 xl:grid-cols-2">
                {past.map((exam) => (
                  <ExamCard key={exam._id} exam={exam} onDeleted={load} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

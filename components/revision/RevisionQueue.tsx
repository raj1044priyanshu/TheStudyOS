"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";
import { triggerAchievementCheck } from "@/lib/client-achievements";

interface RevisionItem {
  _id: string;
  topic: string;
  subject: string;
  type: "note" | "flashcard" | "quiz" | "manual";
  sourceTitle: string;
  interval: number;
  repetitions: number;
  lastReviewDate?: string | null;
  nextReviewDate: string;
}

interface UpcomingDay {
  date: string;
  count: number;
  items: RevisionItem[];
}

const RATING_OPTIONS = [
  { label: "😵 Forgot", value: 0 },
  { label: "😕 Hard", value: 2 },
  { label: "😐 Okay", value: 3 },
  { label: "😊 Good", value: 4 },
  { label: "🤩 Perfect", value: 5 }
];

export function RevisionQueue() {
  const [due, setDue] = useState<RevisionItem[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingDay[]>([]);
  const [selected, setSelected] = useState<RevisionItem | null>(null);
  const [reviewMessage, setReviewMessage] = useState("");

  async function load() {
    const response = await fetch("/api/revision/due", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setDue(data.due ?? []);
      setUpcoming(data.upcoming ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const overdueCount = useMemo(
    () => due.filter((item) => new Date(item.nextReviewDate).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000).length,
    [due]
  );

  async function submitReview(quality: number) {
    if (!selected) return;
    const response = await fetch(`/api/revision/${selected._id}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quality })
    });
    const data = await response.json();
    if (!response.ok) {
      toast.error(data.error ?? "Could not update revision");
      return;
    }
    setReviewMessage(data.message ?? "");
    void triggerAchievementCheck("revision_reviewed");
    await load();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Spaced Repetition</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Revision</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Review what is due today, rate how well it came back, and let the next interval adapt around that recall quality.
        </p>
      </div>

      {due.length > 20 ? (
        <div className="rounded-[22px] bg-[#FCD34D]/18 px-5 py-4 text-sm text-[#92400E]">
          You have many items due. Consider reviewing for 30 minutes.
        </div>
      ) : null}

      {due.length === 0 ? (
        <EmptyState title="All caught up" description="✅ All caught up! Nothing due today." />
      ) : (
        <section className="space-y-4">
          <h3 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Due Today</h3>
          <div className="grid gap-4 xl:grid-cols-2">
            {due.map((item) => {
              const color = SUBJECT_COLOR_VALUES[item.subject] ?? SUBJECT_COLOR_VALUES.Other;
              const isOverdue = new Date(item.nextReviewDate).getTime() < Date.now() - 7 * 24 * 60 * 60 * 1000;
              return (
                <div key={item._id} className="glass-card rounded-[26px] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: `${color}18`, color }}>
                        {item.subject}
                      </span>
                      <p className="mt-3 font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">{item.topic}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">{item.type} • {item.sourceTitle}</p>
                    </div>
                    {isOverdue ? <span className="rounded-full bg-[#F59E0B]/15 px-3 py-1 text-xs font-medium text-[#B45309]">Overdue</span> : null}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--muted-foreground)]">
                    <span>Last reviewed: {item.lastReviewDate ? new Date(item.lastReviewDate).toLocaleDateString() : "New item"}</span>
                    <span>Next interval: {item.interval} days</span>
                  </div>
                  <Button className="mt-4" onClick={() => {
                    setSelected(item);
                    setReviewMessage("");
                  }}>
                    Review
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="glass-card rounded-[28px] p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">Upcoming</h3>
          {overdueCount > 0 ? <span className="text-sm text-[#B45309]">{overdueCount} heavily overdue</span> : null}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-7">
          {upcoming.map((day) => (
            <div key={day.date} className="surface-card rounded-[20px] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{new Date(day.date).toLocaleDateString(undefined, { weekday: "short" })}</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">{day.date}</p>
              <p className="mt-4 font-headline text-[2rem] text-[var(--foreground)]">{day.count}</p>
              <p className="text-xs text-[var(--muted-foreground)]">items</p>
            </div>
          ))}
        </div>
      </section>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Review: ${selected.topic}` : "Review"}
        size="md"
      >
        {selected ? (
          <div className="space-y-5">
            <div className="surface-card rounded-[22px] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{selected.sourceTitle}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                This {selected.type} item is due now. Recall the key ideas before rating how easily it came back.
              </p>
            </div>
            <div className="grid gap-2">
              {RATING_OPTIONS.map((option) => (
                <Button key={option.value} variant="outline" onClick={() => void submitReview(option.value)}>
                  {option.label}
                </Button>
              ))}
            </div>
            {reviewMessage ? <p className="text-sm text-[#0F766E]">{reviewMessage}</p> : null}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}

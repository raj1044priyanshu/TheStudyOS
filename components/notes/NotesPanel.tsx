"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { IconBook2, IconCirclePlus, IconSearch } from "@tabler/icons-react";
import { useNotes } from "@/hooks/useNotes";
import { CLASS_OPTIONS, SUBJECTS } from "@/lib/constants";
import { NoteCard } from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type NotesPanelForm = {
  subject: string;
  topic: string;
  class: string;
  detailLevel: "quick" | "standard" | "detailed";
};

const DEFAULT_FORM: NotesPanelForm = {
  subject: "Mathematics",
  topic: "",
  class: "Class 10",
  detailLevel: "standard"
};

const DETAIL_LEVEL_OPTIONS: Array<{ value: NotesPanelForm["detailLevel"]; label: string }> = [
  { value: "quick", label: "Quick" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" }
];

export function NotesPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notes, loading, refresh } = useNotes();
  const [form, setForm] = useState<NotesPanelForm>({ ...DEFAULT_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");

  const initialValues = useMemo(
    () => ({
      subject: searchParams.get("subject"),
      topic: searchParams.get("topic") ?? DEFAULT_FORM.topic,
      class: searchParams.get("class") ?? DEFAULT_FORM.class
    }),
    [searchParams]
  );

  useEffect(() => {
    setForm((current) => ({
      ...current,
      ...(initialValues.subject ? { subject: initialValues.subject } : {}),
      topic: initialValues.topic,
      class: initialValues.class
    }));
    setSubjectFilter(initialValues.subject || "all");
  }, [initialValues]);

  async function remove(id: string) {
    await fetch(`/api/notes/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function toggleFavorite(id: string, isFavorite: boolean) {
    await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite })
    });
    await refresh();
  }

  async function generateNote() {
    setSubmitting(true);
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        style: "topper"
      })
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      toast.error(data.error?.message ?? data.error ?? "Failed to generate note");
      return;
    }

    toast.success("Note generated");
    await refresh();
    window.dispatchEvent(new CustomEvent("tour:note-generated"));
    router.replace(`/dashboard/study?tool=notes&subject=${encodeURIComponent(form.subject)}`);
  }

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesSubject = subjectFilter === "all" || note.subject === subjectFilter;
      const query = search.trim().toLowerCase();
      const matchesQuery =
        !query ||
        note.title.toLowerCase().includes(query) ||
        note.subject.toLowerCase().includes(query) ||
        note.contentPreview.toLowerCase().includes(query);
      return matchesSubject && matchesQuery;
    });
  }, [notes, search, subjectFilter]);

  return (
    <div className="space-y-6">
      <section className="surface-card rounded-[28px] p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Study Surface</p>
            <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Generate a Note</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted-foreground)]">
              Build a clear, structured note first. Every note you generate becomes reusable material for testing, revision, and tracking.
            </p>
          </div>
          <div className="glass-pill inline-flex items-center gap-2 px-4 py-2 text-sm text-[var(--muted-foreground)]">
            <IconBook2 className="h-4 w-4 text-[#7B6CF6]" />
            Saved notes: {notes.length}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Subject</label>
            <Select value={form.subject} onChange={(event) => setForm((state) => ({ ...state, subject: event.target.value }))}>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Class / Grade</label>
            <Select value={form.class} onChange={(event) => setForm((state) => ({ ...state, class: event.target.value }))}>
              {CLASS_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Topic</label>
            <Input
              id="generate-note-btn"
              value={form.topic}
              onChange={(event) => setForm((state) => ({ ...state, topic: event.target.value }))}
              placeholder="Enter the exact topic you want to study"
            />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Detail level</label>
            <div className="flex flex-wrap gap-2">
              {DETAIL_LEVEL_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setForm((state) => ({ ...state, detailLevel: option.value }))}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition",
                    form.detailLevel === option.value
                      ? "border-transparent bg-[#7B6CF6] text-white shadow-[0_10px_18px_rgba(123,108,246,0.24)]"
                      : "surface-pill text-[var(--muted-foreground)]"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <Button onClick={() => void generateNote()} disabled={submitting || !form.topic.trim()} className="gap-2">
            <IconCirclePlus className="h-4 w-4" />
            {submitting ? "Generating..." : "Generate Note"}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Library</p>
            <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Your Notes</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px]">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--tertiary-foreground)]" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" className="pl-9" />
            </div>
            <Select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="min-w-[180px]">
              <option value="all">All subjects</option>
              {SUBJECTS.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="columns-1 gap-4 md:columns-2">
            {Array.from({ length: 6 }).map((_, idx) => (
              <Skeleton key={idx} className="mb-4 h-56 rounded-[2rem]" />
            ))}
          </div>
        ) : filteredNotes.length === 0 ? (
          <div id="notes-empty-state" className="glass-card p-6">
            <EmptyState
              title={notes.length === 0 ? "No notes yet" : "No matching notes"}
              description={
                notes.length === 0
                  ? "Generate your first note to start your study library."
                  : "Try a different subject or search term."
              }
              actionLabel="Generate Note"
              onAction={() => document.getElementById("generate-note-btn")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            />
          </div>
        ) : (
          <div id="notes-library" className="columns-1 gap-4 md:columns-2">
            {filteredNotes.map((note) => (
              <NoteCard key={note._id} note={note} onDelete={remove} onFavorite={toggleFavorite} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

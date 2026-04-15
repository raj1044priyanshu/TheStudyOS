"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IconNotebook, IconPencil, IconSparkles, IconWand } from "@tabler/icons-react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { queueCelebrationsFromGamification } from "@/lib/client-celebrations";
import { CLASS_OPTIONS, SUBJECTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialValues?: Partial<{
    subject: string;
    topic: string;
    class: string;
    detailLevel: string;
    style: string;
  }>;
}

const DEFAULT_FORM = {
  subject: "Mathematics",
  topic: "",
  class: "Class 10",
  detailLevel: "standard",
  style: "topper"
};

export function GenerateNoteModal({ open, onClose, onCreated, initialValues }: Props) {
  const [form, setForm] = useState({
    ...DEFAULT_FORM
  });
  const [loading, setLoading] = useState(false);
  const optionButtonClassName = "min-h-10 max-w-full rounded-full border px-3.5 py-2 text-center text-xs leading-4 transition whitespace-normal";
  const stylePreviewLabel = form.style === "minimal" ? "Minimal notebook style" : form.style === "classic" ? "Classic notebook style" : "Topper's notebook style";
  const normalizedInitialValues = useMemo(
    () => ({
      ...DEFAULT_FORM,
      ...initialValues
    }),
    [initialValues]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm((current) => ({
      ...current,
      ...normalizedInitialValues
    }));
  }, [open, normalizedInitialValues]);

  function useExample() {
    setForm((current) => ({
      ...current,
      subject: "Biology",
      topic: "Photosynthesis",
      class: "Class 10",
      detailLevel: "standard",
      style: "topper"
    }));
  }

  async function submit() {
    setLoading(true);
    const response = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error?.message ?? data.error ?? "Failed to generate note");
      return;
    }

    queueCelebrationsFromGamification(data.events, "notes");
    trackEvent("note_generated", {
      subject: form.subject,
      className: form.class,
      detailLevel: form.detailLevel,
      style: form.style
    });

    window.dispatchEvent(new CustomEvent("tour:note-generated"));
    toast.success("Notes generated successfully");
    onCreated();
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Generate Handwritten Notes"
      description="Choose the subject, topic, depth, and style. The preview updates while you configure the note so the final result stays predictable."
      size="xl"
      bodyClassName="space-y-5"
      closeButtonTourId="notes-builder-close"
      dialogTourId="notes-builder-dialog"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button data-tour-id="notes-generate-submit" onClick={submit} disabled={loading || !form.topic.trim()} className="gap-2">
            <IconWand className="h-4 w-4" />
            {loading ? "Generating Note..." : "Generate Note"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
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

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Topic</label>
                <Button data-tour-id="notes-example-fill" type="button" variant="ghost" size="sm" onClick={useExample}>
                  Use Example
                </Button>
              </div>
              <Input
                data-tour-id="notes-topic-input"
                placeholder="Photosynthesis"
                value={form.topic}
                onChange={(event) => setForm((state) => ({ ...state, topic: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Detail Level</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "quick", label: "Quick" },
                  { value: "standard", label: "Standard" },
                  { value: "detailed", label: "Detailed" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((state) => ({ ...state, detailLevel: option.value }))}
                    className={cn(
                      optionButtonClassName,
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Note Style</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "minimal", label: "Minimal" },
                  { value: "classic", label: "Classic" },
                  { value: "topper", label: "Topper's Best" }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setForm((state) => ({ ...state, style: option.value }))}
                    className={cn(
                      optionButtonClassName,
                      form.style === option.value
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
        </div>

        <div className="surface-card rounded-[24px] p-4 xl:sticky xl:top-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <IconNotebook className="h-4 w-4 text-[#7B6CF6]" />
              Live preview
            </p>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--tertiary-foreground)]">{form.subject}</p>
          </div>

          <div className="note-surface relative overflow-hidden rounded-[20px] p-5">
            {loading ? (
              <div className="space-y-2">
                <div className="relative h-4 overflow-hidden rounded bg-slate-200/70">
                  <div className="absolute left-0 top-0 h-full w-16 animate-pen-write rounded bg-[#7B6CF6]/40" />
                </div>
                <div className="relative h-4 overflow-hidden rounded bg-slate-200/70">
                  <div className="absolute left-0 top-0 h-full w-16 animate-pen-write rounded bg-[#6EE7B7]/45 [animation-delay:0.25s]" />
                </div>
                <div className="relative h-4 overflow-hidden rounded bg-slate-200/70">
                  <div className="absolute left-0 top-0 h-full w-16 animate-pen-write rounded bg-[#C4B5FD]/55 [animation-delay:0.5s]" />
                </div>
                <p className="note-handwritten-body text-note-secondary pt-1 text-[1.2rem]">
                  <IconPencil className="mr-1 inline h-4 w-4" />
                  Preparing {stylePreviewLabel.toLowerCase()}...
                </p>
              </div>
            ) : (
              <div>
                <p className="note-handwritten-heading text-note-primary text-[2.2rem] sm:text-[2.6rem]">
                  {form.topic || "Topic heading appears here"}
                </p>
                <p className="note-handwritten-body text-note-secondary mt-2 text-[1.08rem] leading-8 sm:text-[1.18rem]">
                  Includes clean sections, high-contrast highlights, and a revision-friendly handwritten layout.
                </p>
                <div className="mt-3 inline-flex max-w-full items-center gap-1 rounded-full bg-[#FEF08A] px-2.5 py-1.5 text-xs font-medium leading-4 text-slate-800">
                  <IconSparkles className="h-3 w-3 shrink-0" />
                  {stylePreviewLabel}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

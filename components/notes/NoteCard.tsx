"use client";

import Link from "next/link";
import { format } from "date-fns";
import { IconEye, IconFileDownload, IconStar, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SUBJECT_COLOR_VALUES } from "@/lib/constants";
import type { NoteSummary } from "@/types";

interface Props {
  note: NoteSummary;
  onDelete: (id: string) => void;
  onFavorite: (id: string, value: boolean) => void;
}

export function NoteCard({ note, onDelete, onFavorite }: Props) {
  const subjectColor = SUBJECT_COLOR_VALUES[note.subject] ?? SUBJECT_COLOR_VALUES.Other;

  return (
    <article
      data-tour-id="note-card"
      className="note-surface group relative mb-4 break-inside-avoid overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-5 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[var(--panel-shadow-hover)]"
    >
      <div className="relative mb-3 flex items-center justify-between">
        <span
          className="inline-flex rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em]"
          style={{
            backgroundColor: `${subjectColor}22`,
            color: subjectColor
          }}
        >
          {note.subject}
        </span>
        <button
          type="button"
          onClick={() => onFavorite(note._id, !note.isFavorite)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition",
            note.isFavorite
              ? "border-[#FCD34D] bg-[#FCD34D]/25 text-[#A16207]"
              : "border-[color:var(--note-border)] bg-[rgba(255,255,255,0.34)] text-[var(--note-muted-foreground)] hover:text-[#A16207]"
          )}
        >
          <IconStar className={cn("h-3.5 w-3.5", note.isFavorite ? "fill-current" : "")} />
          Favorite
        </button>
      </div>

      <h3 className="text-note-primary mb-2 line-clamp-2 font-headline text-3xl leading-tight">{note.title}</h3>
      <p className="text-note-secondary line-clamp-4 text-sm leading-7">
        {note.contentPreview.replace(/\[[^\]]+\]/g, " ")}
      </p>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.12em] text-[var(--note-muted-foreground)]">
        {format(new Date(note.createdAt), "dd MMM yyyy")}
      </p>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href={`/notes/${note._id}`} className="contents">
            <Button size="sm" className="gap-1.5">
              <IconEye className="h-3.5 w-3.5" />
              View
            </Button>
          </Link>
          <Link href={`/notes/${note._id}`} className="contents">
            <Button size="sm" variant="outline" className="gap-1.5">
              <IconFileDownload className="h-3.5 w-3.5" />
              PDF
            </Button>
          </Link>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 px-2 text-[#BE123C] hover:bg-[#FFE4E6] hover:text-[#9F1239]"
          onClick={() => onDelete(note._id)}
        >
          <IconTrash className="h-3.5 w-3.5" />
          Remove
        </Button>
      </div>
    </article>
  );
}

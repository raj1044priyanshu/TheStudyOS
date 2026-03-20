"use client";

import { useState } from "react";
import { IconCirclePlus, IconFilter } from "@tabler/icons-react";
import { useNotes } from "@/hooks/useNotes";
import { NoteCard } from "@/components/notes/NoteCard";
import { GenerateNoteModal } from "@/components/notes/GenerateNoteModal";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";

export default function NotesPage() {
  const [open, setOpen] = useState(false);
  const { notes, loading, refresh } = useNotes();

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

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Library</p>
          <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Notes</h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
            Keep bright, readable study notes in one place, then open each note into a focused revision view with clean study visuals.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filter
          </Button>
          <Button data-tour-id="notes-generate" onClick={() => setOpen(true)} className="gap-2">
            <IconCirclePlus className="h-4 w-4" />
            New Entry
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="columns-1 gap-4 md:columns-2">
          {Array.from({ length: 6 }).map((_, idx) => (
            <Skeleton key={idx} className="mb-4 h-56 rounded-[2rem]" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="glass-card p-6">
          <EmptyState
            title="No notes yet"
            description="Generate your first study note to start your revision library."
            actionLabel="Generate Note"
            onAction={() => setOpen(true)}
          />
        </div>
      ) : (
        <section className="glass-card p-5 md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Collection</p>
              <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Saved notes</h3>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-[var(--muted-foreground)]">{notes.length} saved</p>
              <Button onClick={() => setOpen(true)}>Generate note</Button>
            </div>
          </div>
          <div className="columns-1 gap-4 md:columns-2">
            {notes.map((note) => (
              <NoteCard key={note._id} note={note} onDelete={remove} onFavorite={toggleFavorite} />
            ))}
          </div>
        </section>
      )}

      <GenerateNoteModal open={open} onClose={() => setOpen(false)} onCreated={refresh} />
    </div>
  );
}

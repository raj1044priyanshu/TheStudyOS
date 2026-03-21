"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { IconCards, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SUBJECTS } from "@/lib/constants";

interface FlashcardCard {
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
}

interface FlashcardDeckSummary {
  _id: string;
  topic: string;
  subject: string;
  cards: FlashcardCard[];
  createdAt: string;
}

interface Props {
  initialDecks: FlashcardDeckSummary[];
}

export function FlashcardsPanel({ initialDecks }: Props) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [decks, setDecks] = useState<FlashcardDeckSummary[]>(initialDecks);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeckSummary | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateDeck() {
    setLoading(true);
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, subject })
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      toast.error(data.error ?? "Could not generate flashcards");
      return;
    }

    setDecks((current) => [
      {
        _id: data.deck._id,
        topic: data.deck.topic,
        subject: data.deck.subject,
        cards: data.deck.cards,
        createdAt: data.deck.createdAt
      },
      ...current
    ]);
    setActiveDeck({
      _id: data.deck._id,
      topic: data.deck.topic,
      subject: data.deck.subject,
      cards: data.deck.cards,
      createdAt: data.deck.createdAt
    });
  }

  const visibleDecks = useMemo(() => decks.slice(0, 12), [decks]);

  return (
    <>
      <div className="space-y-6">
        <section className="surface-card rounded-[28px] p-5 md:p-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Memory drills</p>
            <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Generate a Deck</h3>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_220px_auto]">
            <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Topic" />
            <Select value={subject} onChange={(event) => setSubject(event.target.value)}>
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Button id="flashcard-generate-btn" onClick={() => void generateDeck()} disabled={loading || !topic.trim()}>
              {loading ? "Generating..." : "Generate Flashcards"}
            </Button>
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Library</p>
            <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">Your Decks</h3>
          </div>

          {visibleDecks.length === 0 ? (
            <EmptyState title="No decks yet" description="Generate a deck for any topic and review it in a full-screen study overlay." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleDecks.map((deck) => (
                <article key={deck._id} className="glass-card rounded-[24px] p-5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#7B6CF6]/12 text-[#7B6CF6]">
                    <IconCards className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{deck.topic}</h4>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-[#7B6CF6]/12 px-3 py-1 text-xs font-medium text-[#7B6CF6]">{deck.subject}</span>
                    <span className="rounded-full bg-[color:var(--surface-low)] px-3 py-1 text-xs text-[var(--muted-foreground)]">
                      {deck.cards.length} cards
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">{new Date(deck.createdAt).toLocaleDateString()}</p>
                  <Button className="mt-4" onClick={() => setActiveDeck(deck)}>
                    Study Now
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {activeDeck ? (
        <div className="fixed inset-0 z-[9998] bg-[rgba(17,24,39,0.5)] p-3 backdrop-blur-md md:p-6">
          <div className="mx-auto flex h-full max-w-6xl flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/70">{activeDeck.subject}</p>
                <h3 className="font-headline text-4xl tracking-[-0.03em] text-white">{activeDeck.topic}</h3>
              </div>
              <Button variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/20" onClick={() => setActiveDeck(null)}>
                <IconX className="mr-2 h-4 w-4" />
                Exit
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <FlashcardDeck cards={activeDeck.cards} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

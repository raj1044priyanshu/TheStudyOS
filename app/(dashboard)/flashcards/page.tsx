"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FlashcardDeck } from "@/components/flashcards/FlashcardDeck";
import { EmptyState } from "@/components/shared/EmptyState";

interface Deck {
  cards: { front: string; back: string; difficulty: "easy" | "medium" | "hard" }[];
}

export default function FlashcardsPage() {
  const [topic, setTopic] = useState("");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateDeck() {
    setLoading(true);
    const response = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic })
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      toast.error("Could not generate flashcards");
      return;
    }

    setDeck(data.deck);
    window.dispatchEvent(new CustomEvent("tour:flashcards-generated"));
  }

  function useExample() {
    setTopic("Cell structure and organelles");
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Revision</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Flashcards</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Generate a revision deck instantly and review it in a centered flip-card workspace.
        </p>
      </div>
      <div className="glass-card flex flex-wrap gap-2 p-5">
        <Input
          data-tour-id="flashcards-topic-input"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Topic"
          className="max-w-md"
        />
        <Button data-tour-id="flashcards-example-fill" type="button" variant="ghost" onClick={useExample}>
          Use Example
        </Button>
        <Button data-tour-id="flashcards-generate" onClick={generateDeck} disabled={loading || !topic.trim()}>
          {loading ? "Generating..." : "Generate Deck"}
        </Button>
      </div>
      {deck ? <FlashcardDeck cards={deck.cards} /> : <EmptyState title="No deck yet" description="Enter a topic and generate a flashcard deck." />}
    </div>
  );
}

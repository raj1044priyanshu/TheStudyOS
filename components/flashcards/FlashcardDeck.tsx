"use client";

import { useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface CardItem {
  front: string;
  back: string;
  difficulty: "easy" | "medium" | "hard";
}

interface Props {
  cards: CardItem[];
}

export function FlashcardDeck({ cards }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [deck, setDeck] = useState(cards);

  const current = deck[index];
  const progress = useMemo(() => ((index + 1) / Math.max(deck.length, 1)) * 100, [index, deck.length]);

  function markDifficulty(value: "easy" | "medium" | "hard") {
    setDeck((prev) => prev.map((card, idx) => (idx === index ? { ...card, difficulty: value } : card)));
  }

  function goTo(nextIndex: number) {
    setFlipped(false);
    setIndex(nextIndex);
  }

  return (
    <div className="glass-card space-y-5 p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Deck progress</p>
          <h3 className="mt-2 font-headline text-4xl tracking-[-0.03em] text-[var(--foreground)]">
            Card {index + 1} of {deck.length}
          </h3>
        </div>
        <span className="glass-pill px-4 py-2 text-sm text-[var(--muted-foreground)]">{Math.round(progress)}% complete</span>
      </div>

      <Progress value={progress} />

      <div className="mx-auto max-w-3xl perspective-[1200px]">
        <button
          data-tour-id="flashcards-flip-card"
          className={`relative h-[340px] w-full rounded-[32px] text-left transition-transform duration-500 [transform-style:preserve-3d] ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
          onClick={() => {
            window.dispatchEvent(new CustomEvent("tour:flashcard-flipped"));
            setFlipped((s) => !s);
          }}
        >
          <div className="glass-card absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center [backface-visibility:hidden]">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Front</p>
            <div className="font-headline text-5xl leading-[1.02] tracking-[-0.03em] text-[var(--foreground)]">{current?.front}</div>
            <p className="text-sm text-[var(--muted-foreground)]">Tap to reveal the answer</p>
          </div>
          <div className="glass-card absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Back</p>
            <div className="max-w-2xl text-lg leading-8 text-[var(--foreground)]">{current?.back}</div>
          </div>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => goTo(Math.max(0, index - 1))}>
            Previous
          </Button>
          <Button variant="outline" onClick={() => goTo(Math.min(deck.length - 1, index + 1))}>
            Next
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setFlipped(false);
              setDeck((prev) => [...prev].sort(() => Math.random() - 0.5));
              setIndex(0);
            }}
          >
            Shuffle
          </Button>
        </div>

        <div id="flashcard-difficulty-btns" className="flex flex-wrap gap-2">
          <Button data-tour-id="flashcards-mark-easy" variant="ghost" className="bg-[#6EE7B7]/18 text-[#0F766E] hover:bg-[#6EE7B7]/28" onClick={() => markDifficulty("easy")}>
            Easy
          </Button>
          <Button variant="ghost" className="bg-[#FCD34D]/18 text-[#A16207] hover:bg-[#FCD34D]/28" onClick={() => markDifficulty("medium")}>
            Medium
          </Button>
          <Button variant="ghost" className="bg-[#FCA5A5]/18 text-[#B91C1C] hover:bg-[#FCA5A5]/28" onClick={() => markDifficulty("hard")}>
            Hard
          </Button>
        </div>
      </div>

      <div className="surface-card rounded-[22px] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
        Current difficulty:
        <span className="ml-2 font-medium capitalize text-[var(--foreground)]">{current?.difficulty ?? "medium"}</span>
      </div>
    </div>
  );
}

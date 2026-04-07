"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

const DEFAULT_ROTATING_WORDS = ["Calm", "Focused", "Connected", "Confident"];
const TYPE_SPEED_MS = 90;
const DELETE_SPEED_MS = 46;
const HOLD_SPEED_MS = 1250;

function toDisplayWord(word: string) {
  if (!word) {
    return "";
  }

  return word.charAt(0).toUpperCase() + word.slice(1);
}

function buildRotatingWords(baseWord: string) {
  const normalizedBase = baseWord.trim().replace(/[^a-zA-Z'-]/g, "");
  const words = [toDisplayWord(normalizedBase || "Calm"), ...DEFAULT_ROTATING_WORDS];

  return Array.from(new Set(words.filter(Boolean)));
}

function splitHeroTitle(title: string) {
  const trimmed = title.trim();
  const match = trimmed.match(/^([^\s,.;:!?]+)([,.!?;:]?)(?:\s+(.*))?$/);

  if (!match) {
    return {
      leadWord: "Calm",
      punctuation: "",
      rest: trimmed || "study flow for every subject."
    };
  }

  return {
    leadWord: match[1] || "Calm",
    punctuation: match[2] || "",
    rest: match[3] || ""
  };
}

type AnimationPhase = "typing" | "holding" | "deleting";

export function RotatingHeroHeadline({ title }: { title: string }) {
  const prefersReducedMotion = useReducedMotion();
  const { leadWord, punctuation, rest } = useMemo(() => splitHeroTitle(title), [title]);
  const rotatingWords = useMemo(() => buildRotatingWords(leadWord), [leadWord]);
  const animatedWords = useMemo(
    () => rotatingWords.map((word) => `${word}${punctuation}`),
    [punctuation, rotatingWords]
  );
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<AnimationPhase>("typing");
  const [visibleLength, setVisibleLength] = useState(0);

  useEffect(() => {
    setIndex(0);
    setPhase("typing");
    setVisibleLength(prefersReducedMotion ? animatedWords[0]?.length ?? 0 : 0);
  }, [animatedWords, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion || animatedWords.length <= 1) {
      return;
    }

    const activeWord = animatedWords[index] ?? animatedWords[0] ?? `${leadWord}${punctuation}`;
    const isTypingDone = visibleLength >= activeWord.length;
    const isDeletingDone = visibleLength <= 0;

    const timeoutId = window.setTimeout(() => {
      if (phase === "typing") {
        if (isTypingDone) {
          setPhase("holding");
          return;
        }

        setVisibleLength((current) => current + 1);
        return;
      }

      if (phase === "holding") {
        setPhase("deleting");
        return;
      }

      if (isDeletingDone) {
        setIndex((current) => (current + 1) % animatedWords.length);
        setPhase("typing");
        return;
      }

      setVisibleLength((current) => current - 1);
    }, phase === "holding" ? HOLD_SPEED_MS : phase === "typing" ? TYPE_SPEED_MS : DELETE_SPEED_MS);

    return () => window.clearTimeout(timeoutId);
  }, [animatedWords, index, leadWord, phase, prefersReducedMotion, punctuation, visibleLength]);

  const activeAnimatedWord = animatedWords[index] ?? `${leadWord}${punctuation}`;
  const visibleWord = prefersReducedMotion ? activeAnimatedWord : activeAnimatedWord.slice(0, visibleLength);
  const maxAnimatedLength = Math.max(...animatedWords.map((word) => word.length), `${leadWord}${punctuation}`.length);

  return (
    <h1
      aria-label={title}
      className="max-w-3xl font-headline text-[clamp(3rem,13vw,5.8rem)] leading-[0.94] tracking-[-0.04em] text-[var(--foreground)]"
    >
      <span className="sr-only">{title}</span>
      <span aria-hidden="true">
        <span
          className="relative inline-flex min-h-[1em] items-baseline align-baseline"
          style={{
            minWidth: `${maxAnimatedLength + 0.35}ch`
          }}
        >
          <span className="inline-block bg-gradient-to-r from-[#7B6CF6] via-[#8B4F48] to-[#7B6CF6] bg-clip-text text-transparent">
            {visibleWord || "\u00A0"}
          </span>
          {!prefersReducedMotion ? (
            <span
              className="ml-[0.04em] inline-block h-[0.82em] w-[0.08em] rounded-full bg-[#8B4F48] opacity-80 animate-pulse"
              style={{ transform: "translateY(0.08em)" }}
            />
          ) : null}
        </span>
        {rest ? ` ${rest}` : ""}
      </span>
    </h1>
  );
}

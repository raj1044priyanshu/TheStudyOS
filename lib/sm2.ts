import { addDays } from "date-fns";
import type { RevisionItemSummary } from "@/types";

export function calculateNextReview<T extends Pick<RevisionItemSummary, "easeFactor" | "interval" | "repetitions" | "lastScore"> & {
  nextReviewDate?: Date | string;
  lastReviewDate?: Date | string | null;
}>(item: T, quality: number): T {
  const normalizedQuality = Math.max(0, Math.min(5, Math.round(quality)));

  if (normalizedQuality < 3) {
    item.repetitions = 0;
    item.interval = 1;
  } else {
    if (item.repetitions === 0) item.interval = 1;
    else if (item.repetitions === 1) item.interval = 6;
    else item.interval = Math.round(item.interval * item.easeFactor);
    item.repetitions += 1;
  }

  item.easeFactor = Math.max(
    1.3,
    item.easeFactor + 0.1 - (5 - normalizedQuality) * (0.08 + (5 - normalizedQuality) * 0.02)
  );
  item.nextReviewDate = addDays(new Date(), item.interval);
  item.lastReviewDate = new Date();
  item.lastScore = normalizedQuality;
  return item;
}

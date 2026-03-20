import { addDays, endOfDay, format } from "date-fns";
import { RevisionItemModel } from "@/models/RevisionItem";
import { calculateNextReview } from "@/lib/sm2";

export async function scheduleRevisionItem({
  userId,
  topic,
  subject,
  type,
  sourceId,
  sourceTitle
}: {
  userId: string;
  topic: string;
  subject: string;
  type: "note" | "flashcard" | "quiz" | "manual";
  sourceId?: string | null;
  sourceTitle: string;
}) {
  const existing = await RevisionItemModel.findOne({ userId, topic, type }).select("_id").lean();
  if (existing) {
    return existing;
  }

  return RevisionItemModel.create({
    userId,
    topic,
    subject,
    type,
    sourceId: sourceId ?? null,
    sourceTitle,
    nextReviewDate: addDays(new Date(), 1)
  });
}

export async function getDueRevisionItems(userId: string, limit = 20) {
  return RevisionItemModel.find({
    userId,
    nextReviewDate: { $lte: endOfDay(new Date()) }
  })
    .sort({ nextReviewDate: 1 })
    .limit(limit)
    .lean();
}

export async function getUpcomingRevisionItems(userId: string, days = 7) {
  const items = await RevisionItemModel.find({ userId })
    .sort({ nextReviewDate: 1 })
    .limit(200)
    .lean();

  return Array.from({ length: days }, (_, index) => {
    const day = addDays(new Date(), index);
    const dayKey = format(day, "yyyy-MM-dd");
    const dayItems = items.filter((item) => format(new Date(item.nextReviewDate), "yyyy-MM-dd") === dayKey);
    return {
      date: dayKey,
      count: dayItems.length,
      items: dayItems
    };
  });
}

export async function reviewRevisionItem(itemId: string, userId: string, quality: number) {
  const item = await RevisionItemModel.findOne({ _id: itemId, userId });
  if (!item) {
    return null;
  }

  calculateNextReview(item, quality);
  await item.save();
  return item;
}

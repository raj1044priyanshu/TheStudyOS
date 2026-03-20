import { Schema, model, models } from "mongoose";
import type { AchievementType } from "@/types";

const AchievementSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "first_note",
        "five_notes",
        "ten_notes",
        "twentyfive_notes",
        "first_quiz",
        "five_quizzes",
        "ten_quizzes",
        "quiz_master_80",
        "quiz_master_90",
        "first_plan",
        "first_task_completed",
        "ten_tasks_completed",
        "fifty_tasks_completed",
        "streak_3",
        "streak_7",
        "streak_14",
        "streak_30",
        "streak_60",
        "streak_100",
        "active_60_minutes",
        "weekly_300_minutes",
        "weekly_600_minutes",
        "level_5",
        "level_10",
        "level_20"
      ] satisfies AchievementType[],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

AchievementSchema.index({ userId: 1, type: 1 }, { unique: true });

export const AchievementModel = models.Achievement || model("Achievement", AchievementSchema);

import { Schema, model, models } from "mongoose";

const RevisionItemSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    type: { type: String, enum: ["note", "flashcard", "quiz", "manual"], required: true },
    sourceId: { type: Schema.Types.ObjectId, default: null },
    sourceTitle: { type: String, default: "" },
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 1 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, required: true, index: true },
    lastReviewDate: { type: Date, default: null },
    lastScore: { type: Number, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

RevisionItemSchema.index({ userId: 1, topic: 1, type: 1 }, { unique: true });

export const RevisionItemModel = models.RevisionItem || model("RevisionItem", RevisionItemSchema);

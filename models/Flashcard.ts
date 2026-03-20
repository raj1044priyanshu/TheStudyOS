import { Schema, model, models } from "mongoose";

const FlashcardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true },
    subject: { type: String, default: "Other" },
    cards: {
      type: [
        {
          front: { type: String, required: true },
          back: { type: String, required: true },
          difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" }
        }
      ],
      default: []
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const FlashcardModel = models.Flashcard || model("Flashcard", FlashcardSchema);

import { Schema, model, models } from "mongoose";

const TeachMeSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true },
    subject: { type: String, required: true },
    studentExplanation: { type: String, required: true },
    understandingScore: { type: Number, required: true },
    correctPoints: { type: [String], default: [] },
    missedPoints: { type: [String], default: [] },
    misconceptions: {
      type: [
        {
          text: { type: String, required: true },
          correction: { type: String, required: true }
        }
      ],
      default: []
    },
    aiSimplifiedExplanation: { type: String, required: true },
    encouragement: { type: String, default: "" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const TeachMeSessionModel = models.TeachMeSession || model("TeachMeSession", TeachMeSessionSchema);

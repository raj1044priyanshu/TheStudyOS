import { Schema, model, models } from "mongoose";

const FocusSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    duration: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now },
    wasCompleted: { type: Boolean, default: true },
    soundUsed: { type: String, default: "None" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const FocusSessionModel = models.FocusSession || model("FocusSession", FocusSessionSchema);

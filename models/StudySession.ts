import { Schema, model, models } from "mongoose";

const StudySessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dayKey: { type: String, required: true, index: true },
    timezone: { type: String, required: true, default: "UTC" },
    activeSeconds: { type: Number, default: 0 },
    lastTrackedAt: { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

StudySessionSchema.index({ userId: 1, dayKey: 1 }, { unique: true });

export const StudySessionModel = models.StudySession || model("StudySession", StudySessionSchema);

import { Schema, model, models } from "mongoose";

const ProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    subjectStudied: { type: String, required: true },
    minutesStudied: { type: Number, default: 0 },
    quizScore: { type: Number, default: 0 },
    notesGenerated: { type: Number, default: 0 }
  },
  { timestamps: false }
);

ProgressSchema.index({ userId: 1, date: 1 }, { unique: false });

export const ProgressModel = models.Progress || model("Progress", ProgressSchema);

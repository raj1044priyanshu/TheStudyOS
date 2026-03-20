import { Schema, model, models } from "mongoose";

const ExamSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true },
    examName: { type: String, required: true },
    examDate: { type: Date, required: true, index: true },
    board: { type: String, default: null },
    syllabus: { type: [String], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ExamModel = models.Exam || model("Exam", ExamSchema);

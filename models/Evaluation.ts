import { Schema, model, models } from "mongoose";

const ScorePartSchema = new Schema(
  {
    obtained: { type: Number, required: true },
    max: { type: Number, required: true },
    comment: { type: String, default: "" }
  },
  { _id: false }
);

const EvaluationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true },
    question: { type: String, required: true },
    studentAnswer: { type: String, required: true },
    wordCount: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    examBoard: { type: String, required: true },
    scores: {
      content: { type: ScorePartSchema, required: true },
      structure: { type: ScorePartSchema, required: true },
      language: { type: ScorePartSchema, required: true },
      examples: { type: ScorePartSchema, required: true },
      conclusion: { type: ScorePartSchema, required: true }
    },
    totalObtained: { type: Number, required: true },
    totalMax: { type: Number, required: true },
    grade: { type: String, default: "" },
    feedback: { type: [String], default: [] },
    overallComment: { type: String, default: "" },
    improvedAnswer: { type: String, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const EvaluationModel = models.Evaluation || model("Evaluation", EvaluationSchema);

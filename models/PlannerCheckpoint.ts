import { Schema, model, models } from "mongoose";

const PlannerQuestionResultSchema = new Schema(
  {
    questionIndex: { type: Number, required: true },
    obtainedMarks: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    feedback: { type: String, default: "" },
    recommendedAction: { type: String, default: "" },
    concept: { type: String, default: "" },
    questionType: {
      type: String,
      enum: ["objective", "fill_blank", "short", "long", "numerical", "case"],
      default: "short"
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    }
  },
  { _id: false }
);

const PlannerCheckpointSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    planId: { type: Schema.Types.ObjectId, ref: "StudyPlan", required: true, index: true },
    date: { type: String, required: true },
    taskIndex: { type: Number, required: true },
    subject: { type: String, required: true },
    chapter: { type: String, required: true },
    examName: { type: String, default: "" },
    board: { type: String, default: "" },
    className: { type: String, default: "" },
    stream: { type: String, default: "" },
    questions: {
      type: [
        {
          prompt: { type: String, required: true },
          concept: { type: String, required: true },
          difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium"
          },
          type: {
            type: String,
            enum: ["objective", "fill_blank", "short", "long", "numerical", "case"],
            required: true
          },
          options: { type: [String], default: [] },
          answerKey: { type: String, default: "" },
          rubric: { type: String, default: "" },
          maxMarks: { type: Number, required: true }
        }
      ],
      default: []
    },
    coverageOutline: { type: [String], default: [] },
    status: { type: String, enum: ["generated", "submitted"], default: "generated" },
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    feedback: { type: [String], default: [] },
    obtainedMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    latestAttemptAt: { type: Date, default: null },
    questionResults: {
      type: [PlannerQuestionResultSchema],
      default: []
    },
    attempts: {
      type: [
        {
          submittedAt: { type: Date, required: true },
          answers: { type: [String], default: [] },
          score: { type: Number, required: true },
          passed: { type: Boolean, required: true },
          obtainedMarks: { type: Number, required: true },
          totalMarks: { type: Number, required: true },
          feedback: { type: [String], default: [] },
          questionResults: {
            type: [PlannerQuestionResultSchema],
            default: []
          }
        }
      ],
      default: []
    }
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

PlannerCheckpointSchema.index({ userId: 1, planId: 1, date: 1, taskIndex: 1 }, { unique: true });

export const PlannerCheckpointModel =
  models.PlannerCheckpoint || model("PlannerCheckpoint", PlannerCheckpointSchema);

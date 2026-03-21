import { Schema, model, models } from "mongoose";

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
          type: {
            type: String,
            enum: ["objective", "fill_blank", "short", "long", "numerical"],
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
    status: { type: String, enum: ["generated", "submitted"], default: "generated" },
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    feedback: { type: [String], default: [] },
    questionResults: {
      type: [
        {
          questionIndex: { type: Number, required: true },
          obtainedMarks: { type: Number, required: true },
          maxMarks: { type: Number, required: true },
          feedback: { type: String, default: "" }
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

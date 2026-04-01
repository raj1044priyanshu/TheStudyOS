import { Schema, model, models } from "mongoose";

const StudyPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "Study Plan" },
    examDate: { type: Date },
    startDate: { type: Date },
    hoursPerDay: { type: Number, default: 1 },
    studyContext: {
      className: { type: String, default: "" },
      board: { type: String, default: "" },
      stream: { type: String, default: "" },
      studyHoursPerDay: { type: Number, default: 1 },
      startDate: { type: String, default: "" },
      examYear: { type: Number, default: null }
    },
    subjects: {
      type: [
        {
          name: { type: String, required: true },
          hoursPerDay: { type: Number, default: 1 },
          priority: { type: Number, default: 1 }
        }
      ],
      default: []
    },
    exams: {
      type: [
        {
          examId: { type: String, default: null },
          subject: { type: String, required: true },
          examName: { type: String, required: true },
          examDate: { type: String, required: true },
          board: { type: String, default: null },
          chapters: { type: [String], default: [] },
          source: { type: String, default: "manual" },
          notes: { type: String, default: "" },
          officialExamDate: { type: String, default: null }
        }
      ],
      default: []
    },
    generatedPlan: {
      type: [
        {
          date: { type: String, required: true },
          tasks: {
            type: [
              {
                subject: { type: String, required: true },
                topic: { type: String, required: true },
                chapter: { type: String, default: null },
                examId: { type: String, default: null },
                examName: { type: String, default: null },
                duration: { type: Number, required: true },
                type: { type: String, enum: ["study", "revision", "practice", "break"], required: true },
                completed: { type: Boolean, default: false },
                checkpointStatus: {
                  type: String,
                  enum: ["not_started", "studied", "checkpoint_required", "passed", "revise_again"],
                  default: "not_started"
                },
                checkpointId: { type: String, default: null },
                checkpointScore: { type: Number, default: null }
              }
            ],
            default: []
          }
        }
      ],
      default: []
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const StudyPlanModel = models.StudyPlan || model("StudyPlan", StudyPlanSchema);

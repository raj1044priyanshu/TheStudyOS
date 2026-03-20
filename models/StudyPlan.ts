import { Schema, model, models } from "mongoose";

const StudyPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "Study Plan" },
    examDate: { type: Date },
    startDate: { type: Date },
    hoursPerDay: { type: Number, default: 1 },
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
    generatedPlan: {
      type: [
        {
          date: { type: String, required: true },
          tasks: {
            type: [
              {
                subject: { type: String, required: true },
                topic: { type: String, required: true },
                duration: { type: Number, required: true },
                type: { type: String, enum: ["study", "revision", "practice", "break"], required: true },
                completed: { type: Boolean, default: false }
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

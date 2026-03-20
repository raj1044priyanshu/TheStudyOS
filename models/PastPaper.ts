import { Schema, model, models } from "mongoose";

const PastPaperSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    fileName: { type: String, required: true },
    subject: { type: String, required: true },
    year: { type: Number, required: true },
    examBoard: { type: String, required: true },
    imageUrl: { type: String, default: null },
    questions: {
      type: [
        {
          questionText: { type: String, required: true },
          topic: { type: String, required: true },
          difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
          marks: { type: Number, required: true },
          questionType: { type: String, enum: ["mcq", "short", "long", "numerical"], required: true }
        }
      ],
      default: []
    },
    topicFrequency: {
      type: [
        {
          topic: { type: String, required: true },
          count: { type: Number, required: true },
          percentage: { type: Number, required: true }
        }
      ],
      default: []
    },
    predictedTopics: {
      type: [
        {
          topic: { type: String, required: true },
          confidence: { type: Number, required: true },
          reason: { type: String, required: true }
        }
      ],
      default: []
    },
    practiceQuestions: {
      type: [
        {
          question: { type: String, required: true },
          modelAnswer: { type: String, required: true },
          marks: { type: Number, required: true },
          topic: { type: String, required: true }
        }
      ],
      default: []
    },
    examInsights: {
      totalQuestions: { type: Number, default: 0 },
      totalMarks: { type: Number, default: 0 },
      difficultyBreakdown: {
        easy: { type: Number, default: 0 },
        medium: { type: Number, default: 0 },
        hard: { type: Number, default: 0 }
      },
      mostTestedTopic: { type: String, default: "" },
      leastTestedTopic: { type: String, default: "" }
    }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PastPaperModel = models.PastPaper || model("PastPaper", PastPaperSchema);

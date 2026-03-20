import { Schema, model, models } from "mongoose";

const GenerationMetaSchema = new Schema(
  {
    provider: { type: String },
    model: { type: String },
    attempts: { type: Number },
    repaired: { type: Boolean },
    validatedAt: { type: Date }
  },
  { _id: false }
);

const QuizSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    topic: { type: String, required: true },
    subject: { type: String, required: true },
    questions: {
      type: [
        {
          question: { type: String, required: true },
          options: {
            A: { type: String, required: true },
            B: { type: String, required: true },
            C: { type: String, required: true },
            D: { type: String, required: true }
          },
          correct: { type: String, enum: ["A", "B", "C", "D"], required: true },
          explanation: { type: String, required: true }
        }
      ],
      default: []
    },
    score: { type: Number, default: 0 },
    totalQuestions: { type: Number, required: true },
    completedAt: { type: Date, default: null },
    timeTaken: { type: Number, default: 0 },
    submittedAnswers: {
      type: [
        {
          questionIndex: { type: Number, required: true },
          selectedOption: { type: String, enum: ["A", "B", "C", "D"], default: null },
          selectedText: { type: String, default: "" },
          isCorrect: { type: Boolean, default: false }
        }
      ],
      default: []
    },
    autopsy: {
      type: {
        mistakeBreakdown: {
          type: [
            {
              questionIndex: { type: Number, required: true },
              questionText: { type: String, required: true },
              studentAnswer: { type: String, required: true },
              correctAnswer: { type: String, required: true },
              mistakeType: {
                type: String,
                enum: ["misconception", "silly_error", "knowledge_gap", "guessed", "time_pressure"],
                required: true
              },
              explanation: { type: String, required: true }
            }
          ],
          default: []
        },
        weakTopics: {
          type: [
            {
              topic: { type: String, required: true },
              reason: { type: String, required: true },
              revisionLink: { type: String, default: "" }
            }
          ],
          default: []
        },
        strengthTopics: { type: [String], default: [] },
        overallPattern: { type: String, default: "" },
        radarData: {
          type: [
            {
              subject: { type: String, required: true },
              score: { type: Number, required: true }
            }
          ],
          default: []
        },
        generatedAt: { type: Date, default: null }
      },
      default: null
    },
    generationMeta: { type: GenerationMetaSchema, default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const QuizModel = models.Quiz || model("Quiz", QuizSchema);

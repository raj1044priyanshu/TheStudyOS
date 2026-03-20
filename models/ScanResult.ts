import { Schema, model, models } from "mongoose";

const ScanResultSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    imageUrl: { type: String, required: true },
    transcription: { type: String, required: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    summary: { type: String, default: "" },
    explanation: { type: String, default: "" },
    concepts: {
      type: [
        {
          name: { type: String, required: true },
          explanation: { type: String, required: true }
        }
      ],
      default: []
    },
    errors: {
      type: [
        {
          originalText: { type: String, required: true },
          correction: { type: String, required: true },
          type: { type: String, enum: ["factual", "calculation", "misconception"], required: true }
        }
      ],
      default: []
    },
    convertedNoteId: { type: Schema.Types.ObjectId, ref: "Note", default: null }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ScanResultModel = models.ScanResult || model("ScanResult", ScanResultSchema);

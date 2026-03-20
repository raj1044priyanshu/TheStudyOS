import { Schema, model, models } from "mongoose";

const ConceptNodeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    conceptName: { type: String, required: true, index: true },
    subject: { type: String, required: true, index: true },
    source: { type: String, enum: ["note", "quiz", "doubt", "flashcard"], required: true },
    sourceId: { type: Schema.Types.ObjectId, required: true },
    sourceTitle: { type: String, default: "" },
    relatedConcepts: {
      type: [
        {
          conceptName: { type: String, required: true },
          relationship: { type: String, required: true }
        }
      ],
      default: []
    },
    confidenceScore: { type: Number, default: 50 },
    timesEncountered: { type: Number, default: 1 },
    lastEncountered: { type: Date, default: Date.now }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ConceptNodeSchema.index({ userId: 1, conceptName: 1, subject: 1 }, { unique: true });

export const ConceptNodeModel = models.ConceptNode || model("ConceptNode", ConceptNodeSchema);

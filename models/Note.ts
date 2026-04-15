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

const NoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    class: { type: String, required: true },
    content: { type: String, required: true },
    htmlContent: { type: String, required: true },
    generationMeta: { type: GenerationMetaSchema, default: null },
    isFavorite: { type: Boolean, default: false },
    tags: { type: [String], default: [] }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const NoteModel = models.Note || model("Note", NoteSchema);

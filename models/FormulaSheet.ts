import { Schema, model, models } from "mongoose";

const FormulaEntrySchema = new Schema(
  {
    formulaText: { type: String, required: true },
    formulaName: { type: String, default: "" },
    chapter: { type: String, default: "" },
    sourceNoteId: { type: Schema.Types.ObjectId, ref: "Note", default: null },
    sourceNoteTitle: { type: String, default: "" },
    addedAt: { type: Date, default: Date.now },
    isManual: { type: Boolean, default: false }
  },
  { _id: true }
);

const FormulaSheetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subject: { type: String, required: true, index: true },
    formulas: { type: [FormulaEntrySchema], default: [] }
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

FormulaSheetSchema.index({ userId: 1, subject: 1 }, { unique: true });

export const FormulaSheetModel = models.FormulaSheet || model("FormulaSheet", FormulaSheetSchema);

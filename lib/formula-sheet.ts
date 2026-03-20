import { Types } from "mongoose";
import { FormulaSheetModel } from "@/models/FormulaSheet";

const FORMULA_REGEX = /\[FORMULA_BOX\]([\s\S]*?)\[\/FORMULA_BOX\]/gi;

export function extractFormulasFromNote(content: string) {
  return [...content.matchAll(FORMULA_REGEX)]
    .map((match) => match[1]?.trim())
    .filter((formula): formula is string => Boolean(formula));
}

export async function upsertFormulaEntry({
  userId,
  subject,
  formulaText,
  formulaName = "",
  chapter = "",
  noteId,
  noteTitle,
  isManual = false
}: {
  userId: string;
  subject: string;
  formulaText: string;
  formulaName?: string;
  chapter?: string;
  noteId?: string | null;
  noteTitle?: string | null;
  isManual?: boolean;
}) {
  const trimmedFormula = formulaText.trim();
  if (!trimmedFormula) {
    return { count: 0, skipped: true };
  }

  const existing = await FormulaSheetModel.findOne({
    userId,
    subject,
    "formulas.formulaText": trimmedFormula
  }).select("_id formulas");

  if (existing) {
    return { count: existing.formulas.length, skipped: true };
  }

  const sheet = await FormulaSheetModel.findOneAndUpdate(
    { userId, subject },
    {
      $setOnInsert: {
        userId,
        subject
      },
      $push: {
        formulas: {
          formulaText: trimmedFormula,
          formulaName,
          chapter,
          sourceNoteId: noteId ? new Types.ObjectId(noteId) : null,
          sourceNoteTitle: noteTitle ?? "",
          addedAt: new Date(),
          isManual
        }
      }
    },
    { upsert: true, new: true }
  );

  return { count: sheet?.formulas.length ?? 0, skipped: false };
}

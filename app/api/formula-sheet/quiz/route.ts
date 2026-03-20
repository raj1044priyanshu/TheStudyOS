import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { FormulaSheetModel } from "@/models/FormulaSheet";
import { generateJsonWithFallback } from "@/lib/ai";
import type { QuizQuestion } from "@/types";

const schema = z.object({
  subject: z.string().min(2),
  count: z.number().min(1).max(20).default(10)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await connectToDatabase();
    const sheet = await FormulaSheetModel.findOne({ userId: authResult.userId, subject: parsed.data.subject }).lean();
    if (!sheet || !sheet.formulas.length) {
      return NextResponse.json({ error: "No formulas found for this subject" }, { status: 404 });
    }

    const formulasList = sheet.formulas.map((formula: { formulaText: string }) => formula.formulaText).join("\n");
    const result = await generateJsonWithFallback<{ questions: QuizQuestion[] }>({
      prompt: `Generate ${parsed.data.count} quiz questions based on these formulas:
${formulasList}. Each question should test understanding or application
of the formula, not just recall. Return ONLY JSON matching the standard
quiz question format:
{ "questions": [{ "question":"", "options":{"A":"","B":"","C":"","D":""},
"correct":"A", "explanation":"" }] }`
    });

    return NextResponse.json({ questions: result.data.questions ?? [] });
  } catch (error) {
    return routeError("formula-sheet:quiz", error);
  }
}

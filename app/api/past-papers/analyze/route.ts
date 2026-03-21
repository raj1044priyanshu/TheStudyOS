import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { PastPaperModel } from "@/models/PastPaper";
import { generateJsonWithFallback } from "@/lib/ai";
import { markFeatureUsed } from "@/lib/progress";

const metadataSchema = z.object({
  subject: z.string().min(2),
  year: z.coerce.number().int().min(1900).max(2100),
  examBoard: z.string().min(2)
});

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`past-paper:${authResult.userId}`, "pastPaper");
    if (rate) return rate;

    const formData = await request.formData();
    const file = formData.get("pdf");
    const parsedMeta = metadataSchema.safeParse({
      subject: formData.get("subject"),
      year: formData.get("year"),
      examBoard: formData.get("examBoard")
    });

    if (!parsedMeta.success) {
      return NextResponse.json({ error: parsedMeta.error.flatten() }, { status: 400 });
    }

    if (!(file instanceof File) || file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 20MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const extracted = await parser.getText();
    await parser.destroy();
    const sourceText = extracted.text?.trim();
    if (!sourceText) {
      return NextResponse.json({ error: "Could not read this PDF. Please try another file." }, { status: 400 });
    }

    const result = await generateJsonWithFallback<{
      questions: Array<{
        questionText: string;
        topic: string;
        difficulty: "easy" | "medium" | "hard";
        marks: number;
        questionType: "mcq" | "short" | "long" | "numerical";
      }>;
      topicFrequency: Array<{ topic: string; count: number; percentage: number }>;
      predictedTopics: Array<{ topic: string; confidence: number; reason: string }>;
      examInsights: {
        totalQuestions: number;
        totalMarks: number;
        difficultyBreakdown: { easy: number; medium: number; hard: number };
        mostTestedTopic: string;
        leastTestedTopic: string;
      };
    }>({
      systemPrompt: "You are an expert academic analyst specializing in exam pattern recognition and question analysis.",
      prompt: `This is a past exam paper for ${parsedMeta.data.subject}, Year ${parsedMeta.data.year}, Board ${parsedMeta.data.examBoard}.

Paper text:
${sourceText.slice(0, 20000)}

Analyze this paper completely and return ONLY this exact JSON:
{
  "questions": [{
    "questionText": "",
    "topic": "",
    "difficulty": "easy",
    "marks": 0,
    "questionType": "mcq"
  }],
  "topicFrequency": [{
    "topic": "",
    "count": 0,
    "percentage": 0
  }],
  "predictedTopics": [{
    "topic": "",
    "confidence": 0,
    "reason": ""
  }],
  "examInsights": {
    "totalQuestions": 0,
    "totalMarks": 0,
    "difficultyBreakdown": { "easy": 0, "medium": 0, "hard": 0 },
    "mostTestedTopic": "",
    "leastTestedTopic": ""
  }
}`
    });

    await connectToDatabase();
    const paper = await PastPaperModel.create({
      userId: authResult.userId,
      fileName: file.name,
      subject: parsedMeta.data.subject,
      year: parsedMeta.data.year,
      examBoard: parsedMeta.data.examBoard,
      imageUrl: null,
      questions: result.data.questions ?? [],
      topicFrequency: result.data.topicFrequency ?? [],
      predictedTopics: result.data.predictedTopics ?? [],
      examInsights: result.data.examInsights ?? {
        totalQuestions: 0,
        totalMarks: 0,
        difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        mostTestedTopic: "",
        leastTestedTopic: ""
      }
    });
    await markFeatureUsed(authResult.userId, "past-papers");

    return NextResponse.json({ paper });
  } catch (error) {
    return routeError("past-papers:analyze", error);
  }
}

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { applyRouteRateLimit, requireUser, routeError } from "@/lib/api";
import { uploadStudyImage } from "@/lib/cloudinary";
import { generateMultimodalStructuredData } from "@/lib/content-service";
import { ScanResultModel } from "@/models/ScanResult";
import { logActivity } from "@/lib/progress";

async function fileToBase64(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return buffer.toString("base64");
}

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const scans = await ScanResultModel.find({ userId: authResult.userId }).sort({ createdAt: -1 }).limit(10).lean();
    return NextResponse.json({ scans });
  } catch (error) {
    return routeError("scanner:get", error);
  }
}

export async function POST(request: Request) {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    const rate = await applyRouteRateLimit(`scanner:${authResult.userId}`, "scanner");
    if (rate) return rate;

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    await connectToDatabase();

    const base64Data = await fileToBase64(file);
    const uploaded = await uploadStudyImage(`data:${file.type};base64,${base64Data}`);

    const analysis = await generateMultimodalStructuredData<{
      transcription: string;
      subject: string;
      topic: string;
      summary: string;
      concepts: Array<{ name: string; explanation: string }>;
      errors: Array<{ originalText: string; correction: string; type: "factual" | "calculation" | "misconception" }>;
    }>({
      systemPrompt: "You are an expert academic OCR and study reviewer. Analyze educational images with precision.",
      parts: [
        { type: "image", data: base64Data, mimeType: file.type || "image/jpeg" },
        {
          type: "text",
          text: `This is a photo of a student's handwritten notes, textbook page,
or exam paper. Perform ALL of the following:

1. TRANSCRIBE: Extract all text exactly as written
2. IDENTIFY: Determine the subject and main topic
3. EXPLAIN: For every concept present, write a clear simple explanation
   as if teaching a 15-year-old
4. ERRORS: Identify any factual errors, calculation mistakes, or
   misconceptions in the handwritten work (if any)
5. SUMMARY: Write a 2-sentence summary of what this page covers

Return ONLY this exact JSON, no markdown:
{
  "transcription": "",
  "subject": "",
  "topic": "",
  "summary": "",
  "concepts": [{ "name": "", "explanation": "" }],
  "errors": [{ "originalText": "", "correction": "", "type": "factual|calculation|misconception" }]
}`
        }
      ]
    });

    if (!analysis.transcription || analysis.transcription.trim().length < 20) {
      return NextResponse.json({ error: "Image quality too low. Please retake in better lighting." }, { status: 400 });
    }

    const scan = await ScanResultModel.create({
      userId: authResult.userId,
      imageUrl: uploaded.secure_url,
      transcription: analysis.transcription,
      subject: analysis.subject || "Other",
      topic: analysis.topic || "Scanned page",
      summary: analysis.summary,
      explanation: (analysis.concepts ?? []).map((item) => `${item.name}: ${item.explanation}`).join("\n\n"),
      concepts: analysis.concepts ?? [],
      errors: analysis.errors ?? []
    });

    const events = await logActivity({
      userId: authResult.userId,
      subject: analysis.subject || "Other",
      type: "scan"
    });

    return NextResponse.json({
      _id: scan._id.toString(),
      imageUrl: scan.imageUrl,
      transcription: scan.transcription,
      subject: scan.subject,
      topic: scan.topic,
      summary: scan.summary,
      concepts: scan.concepts,
      errors: scan.errors,
      explanation: scan.explanation,
      createdAt: scan.createdAt,
      events
    });
  } catch (error) {
    return routeError("scanner:post", error);
  }
}

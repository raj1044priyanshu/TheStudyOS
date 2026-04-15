import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildValidationErrorResponse, objectIdRouteParamSchema, requireRateLimitedUser, routeError } from "@/lib/api";
import { ScanResultModel } from "@/models/ScanResult";
import { NoteModel } from "@/models/Note";
import { generateTextWithMetadata as generateContentWithMetadata } from "@/lib/content-service";
import { scheduleRevisionItem } from "@/lib/revision";
import { extractFormulasFromNote, upsertFormulaEntry } from "@/lib/formula-sheet";
import { upsertConceptNode } from "@/lib/knowledge-graph";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const authResult = await requireRateLimitedUser(request, {
      policy: "scannerConvert",
      key: "scanner-convert"
    });
    if (authResult.error) return authResult.error;

    const parsedId = objectIdRouteParamSchema.safeParse(params.id);
    if (!parsedId.success) {
      return buildValidationErrorResponse(parsedId.error);
    }

    await connectToDatabase();
    const scan = await ScanResultModel.findOne({ _id: parsedId.data, userId: authResult.userId });
    if (!scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.convertedNoteId) {
      return NextResponse.json({ noteId: scan.convertedNoteId.toString(), cached: true });
    }

    const noteResponse = await generateContentWithMetadata(
      `Convert this scanned study material into tagged StudyOS notes.
Subject: ${scan.subject}
Topic: ${scan.topic}
Source transcription:
${scan.transcription}

Return only tagged note content using StudyOS note tags like [TITLE], [HEADING1], [BULLET_POINT], [CHECK_POINT], [STICKY_YELLOW], [FORMULA_BOX], and [EXAMPLE_BOX].`,
      "You are converting scanned study material into clean, exam-ready StudyOS notes."
    );

    const note = await NoteModel.create({
      userId: authResult.userId,
      title: scan.topic,
      subject: scan.subject,
      topic: scan.topic,
      class: "Scanned Material",
      content: noteResponse.text,
      htmlContent: noteResponse.text,
      generationMeta: {
        provider: noteResponse.provider,
        model: noteResponse.model,
        attempts: 1,
        repaired: false,
        validatedAt: new Date()
      },
      tags: [scan.subject, "scanner"]
    });

    scan.convertedNoteId = note._id;
    await scan.save();

    const formulas = extractFormulasFromNote(noteResponse.text);
    await Promise.allSettled([
      scheduleRevisionItem({
        userId: authResult.userId,
        topic: note.topic,
        subject: note.subject,
        type: "note",
        sourceId: note._id.toString(),
        sourceTitle: note.title
      }),
      upsertConceptNode({
        userId: authResult.userId,
        conceptName: note.topic,
        subject: note.subject,
        sourceId: note._id.toString(),
        sourceType: "note",
        sourceTitle: note.title
      }),
      ...formulas.map((formulaText) =>
        upsertFormulaEntry({
          userId: authResult.userId,
          subject: note.subject,
          formulaText,
          noteId: note._id.toString(),
          noteTitle: note.title
        })
      )
    ]);

    return NextResponse.json({ noteId: note._id.toString(), cached: false });
  } catch (error) {
    return routeError("scanner:convert", error);
  }
}

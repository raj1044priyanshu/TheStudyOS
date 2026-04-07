import { z } from "zod";
import { Types } from "mongoose";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { generateTextWithMetadata as generateContentWithMetadata } from "@/lib/content-service";
import { analyzeNoteContent, extractNoteDiagramPlaceholders } from "@/lib/note-content";
import { NoteModel } from "@/models/Note";
import { logActivity } from "@/lib/progress";
import { extractFormulasFromNote, upsertFormulaEntry } from "@/lib/formula-sheet";
import { scheduleRevisionItem } from "@/lib/revision";
import { upsertConceptNode } from "@/lib/knowledge-graph";
import { sendAchievementEmail, sendStreakBrokenEmail, sendStreakMilestoneEmail } from "@/lib/email";
import { createAchievementNotifications, createNotification } from "@/lib/notifications";
import { generateNoteVisual, normalizeNoteVisualErrorMessage, summarizeNoteVisualErrors } from "@/lib/note-visuals";
import type { NoteVisual } from "@/types";

const createNoteSchema = z.object({
  subject: z.string().min(2),
  topic: z.string().min(2),
  class: z.string().min(2),
  detailLevel: z.enum(["quick", "standard", "detailed"]).default("standard"),
  style: z.enum(["minimal", "classic", "topper"]).default("topper")
});

const TOPPER_PROMPT_TEMPLATE = `You are a careful top-performing student creating textbook-safe, exam-ready study notes.
Only include classroom-standard facts that are widely accepted at school level.
If a detail is uncertain, omit it instead of guessing.
Never use meta phrases like "as an automated system", "I am not sure", "double-check", or "consult a teacher".
Structure the output in this EXACT tagged format so it can be rendered with rich stationery styling.
Use these special tags in your output:
[TITLE] Main Topic Title [/TITLE]
[SUBJECT_TAG] Subject Name [/SUBJECT_TAG]
[DATE_TAG] Today's Date [/DATE_TAG]
[HEADING1] Main Section Heading [/HEADING1]
[HEADING2] Sub Section Heading [/HEADING2]
[HEADING3] Small Heading [/HEADING3]
[HIGHLIGHT_YELLOW] important term or phrase [/HIGHLIGHT_YELLOW]
[HIGHLIGHT_GREEN] definition or answer [/HIGHLIGHT_GREEN]
[HIGHLIGHT_PINK] formula or equation [/HIGHLIGHT_PINK]
[HIGHLIGHT_BLUE] example or application [/HIGHLIGHT_BLUE]
[HIGHLIGHT_ORANGE] warning or exception [/HIGHLIGHT_ORANGE]
[STICKY_YELLOW] Quick tip or memory trick [/STICKY_YELLOW]
[STICKY_PINK] Important exam note [/STICKY_PINK]
[STICKY_BLUE] Real-life example [/STICKY_BLUE]
[STAR_POINT] Extremely important point [/STAR_POINT]
[ARROW_POINT] Supporting detail or explanation [/ARROW_POINT]
[CHECK_POINT] Fact to remember [/CHECK_POINT]
[BULLET_POINT] Regular point [/BULLET_POINT]
[FORMULA_BOX] Formula or equation here [/FORMULA_BOX]
[DEFINITION_BOX] Term :: Definition here [/DEFINITION_BOX]
[EXAMPLE_BOX] Worked example here [/EXAMPLE_BOX]
[MEMORY_BOX] Mnemonic or memory trick [/MEMORY_BOX]
[DIAGRAM_PLACEHOLDER] Describe a clean educational visual that belongs here [/DIAGRAM_PLACEHOLDER]
[DIVIDER]
[MARGIN_NOTE] Side note or annotation [/MARGIN_NOTE]
Generate thorough, complete notes for a {class} student on "{topic}" from {subject}.
Include key concepts, definitions, examples, safe formulas where applicable, and exam tips.
Prefer precise, high-confidence explanations over dramatic wording.`;

function buildBasePrompt({
  subject,
  topic,
  grade,
  detailLevel,
  style
}: {
  subject: string;
  topic: string;
  grade: string;
  detailLevel: "quick" | "standard" | "detailed";
  style: "minimal" | "classic" | "topper";
}) {
  return `Generate only tagged note content.
Subject: ${subject}
Topic: ${topic}
Grade: ${grade}
Detail level: ${detailLevel}
Style preference: ${style}
Rules:
- Return only tagged note content. No markdown fences or commentary.
- Use [TITLE], [SUBJECT_TAG], and [DATE_TAG] exactly once each.
- Use at least 2 heading blocks total across [HEADING1], [HEADING2], and [HEADING3].
- Use at least 6 tagged study body blocks from [STAR_POINT], [ARROW_POINT], [CHECK_POINT], [BULLET_POINT], [FORMULA_BOX], [DEFINITION_BOX], [EXAMPLE_BOX], [MEMORY_BOX], and sticky notes.
- Include at least 2 [DIAGRAM_PLACEHOLDER] lines for clean educational visuals or diagrams.
- Only use inline [HIGHLIGHT_*] tags in balanced open/close pairs. Never leave an unmatched highlight tag behind.
- Keep every statement classroom-safe and fact-focused.
- Do not guess, hedge, or include low-confidence wording.
- If no formula applies, use definitions, examples, or memory tricks instead.
- Always close every tag correctly and keep one block tag per line.`;
}

function buildRepairPrompt({
  subject,
  topic,
  grade,
  detailLevel,
  style,
  issues
}: {
  subject: string;
  topic: string;
  grade: string;
  detailLevel: "quick" | "standard" | "detailed";
  style: "minimal" | "classic" | "topper";
  issues: string[];
}) {
  return `${buildBasePrompt({ subject, topic, grade, detailLevel, style })}

The previous draft failed validation for these reasons:
${issues.map((issue, index) => `${index + 1}. ${issue}`).join("\n")}

Rewrite the full note from scratch and fix every issue.`;
}

async function generateReviewedNote({
  subject,
  topic,
  grade,
  detailLevel,
  style
}: {
  subject: string;
  topic: string;
  grade: string;
  detailLevel: "quick" | "standard" | "detailed";
  style: "minimal" | "classic" | "topper";
}) {
  const systemPrompt = TOPPER_PROMPT_TEMPLATE.replace("{class}", grade).replace("{topic}", topic).replace("{subject}", subject);
  let issues: string[] = [];

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const prompt =
      attempt === 1
        ? buildBasePrompt({ subject, topic, grade, detailLevel, style })
        : buildRepairPrompt({ subject, topic, grade, detailLevel, style, issues });

    const generated = await generateContentWithMetadata(prompt, systemPrompt);
    const analysis = analyzeNoteContent(generated.text, "save");

    if (analysis.status === "pass") {
      return {
        content: generated.text,
        generationMeta: {
          provider: generated.provider,
          model: generated.model,
          attempts: attempt,
          repaired: attempt > 1,
          validatedAt: new Date()
        }
      };
    }

    issues = analysis.issues;
  }

  throw new Error("We couldn't generate a reliable note this time. Please try a narrower topic and try again.");
}

async function generateAndPersistNoteVisuals(note: {
  _id: Types.ObjectId;
  subject: string;
  title: string;
  content: string;
  visualGenerationStatus?: string;
  visualGenerationError?: string;
  visuals?: Array<NoteVisual & { generatedAt: string | Date }>;
  save: () => Promise<unknown>;
}, userId: string) {
  const placeholders = extractNoteDiagramPlaceholders(note.content).slice(0, 8);
  if (!placeholders.length) {
    note.visualGenerationStatus = "idle";
    note.visualGenerationError = "";
    return {
      generated: 0,
      missing: 0,
      visuals: [] as NoteVisual[]
    };
  }

  const visuals: NoteVisual[] = [];
  const failures: string[] = [];
  const failureMessages: string[] = [];
  for (const placeholder of placeholders) {
    try {
      const visual = await generateNoteVisual({
        noteId: note._id.toString(),
        key: placeholder.key,
        subject: note.subject,
        title: note.title,
        description: placeholder.description,
        userId
      });

      if (visual) {
        visuals.push(visual);
      }
    } catch (error) {
      failures.push(placeholder.key);
      failureMessages.push(normalizeNoteVisualErrorMessage(error));
      console.error("Failed to generate note visual during note creation", {
        noteId: note._id.toString(),
        key: placeholder.key,
        error
      });
    }
  }

  note.visuals = visuals;
  note.visualGenerationStatus = failures.length ? (visuals.length ? "partial_error" : "error") : visuals.length ? "ready" : "idle";
  note.visualGenerationError = failures.length ? summarizeNoteVisualErrors(failureMessages, failures.length) : "";

  if (visuals.length > 0 || failures.length > 0) {
    await note.save();
  }

  return {
    generated: visuals.length,
    missing: Math.max(placeholders.length - visuals.length, 0),
    visuals
  };
}

export async function GET() {
  const authResult = await requireUser();
  if (authResult.error) {
    return authResult.error;
  }

  const rate = await applyRouteRateLimit(`notes:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();
  const objectUserId = new Types.ObjectId(authResult.userId);
  const notes = await NoteModel.aggregate<{
    _id: Types.ObjectId;
    title: string;
    subject: string;
    topic: string;
    class: string;
    isFavorite: boolean;
    tags: string[];
    createdAt: Date;
    contentPreview: string;
  }>([
    { $match: { userId: objectUserId } },
    { $sort: { createdAt: -1 } },
    {
      $project: {
        title: 1,
        subject: 1,
        topic: 1,
        class: 1,
        isFavorite: 1,
        tags: 1,
        createdAt: 1,
        contentPreview: { $substrCP: ["$content", 0, 260] }
      }
    }
  ]);

  const payload = notes.map((note) => ({
    _id: note._id.toString(),
    title: note.title,
    subject: note.subject,
    topic: note.topic,
    class: note.class,
    isFavorite: Boolean(note.isFavorite),
    tags: note.tags ?? [],
    createdAt: note.createdAt ? new Date(note.createdAt).toISOString() : new Date().toISOString(),
    contentPreview: note.contentPreview ?? ""
  }));
  return NextResponse.json({ notes: payload });
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const authResult = await requireUser();
  if (authResult.error) {
    return authResult.error;
  }

  const rate = await applyRouteRateLimit(`notes:${authResult.userId}`);
  if (rate) return rate;

  const body = await request.json();
  const parsed = createNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { subject, topic, class: grade, detailLevel, style } = parsed.data;

  try {
    const generated = await generateReviewedNote({ subject, topic, grade, detailLevel, style });

    await connectToDatabase();
    const note = await NoteModel.create({
      userId: authResult.userId,
      title: topic,
      subject,
      topic,
      class: grade,
      content: generated.content,
      htmlContent: generated.content,
      generationMeta: generated.generationMeta,
      tags: [subject, detailLevel, style]
    });
    const visuals = await generateAndPersistNoteVisuals(note, authResult.userId);

    const events = await logActivity({
      userId: authResult.userId,
      subject,
      type: "note",
      notesGenerated: 1,
      durationSeconds: Math.round((Date.now() - startedAt) / 1000)
    });

    const formulas = extractFormulasFromNote(generated.content);
    await Promise.allSettled([
      scheduleRevisionItem({
        userId: authResult.userId,
        topic,
        subject,
        type: "note",
        sourceId: note._id.toString(),
        sourceTitle: note.title
      }),
      upsertConceptNode({
        userId: authResult.userId,
        conceptName: topic,
        subject,
        sourceId: note._id.toString(),
        sourceType: "note",
        sourceTitle: note.title
      }),
      ...formulas.map((formulaText) =>
        upsertFormulaEntry({
          userId: authResult.userId,
          subject,
          formulaText,
          noteId: note._id.toString(),
          noteTitle: note.title
        })
      )
    ]);

    if (events.newAchievements.length) {
      await createAchievementNotifications(authResult.userId, events.newAchievements).catch((error) => {
        console.error("Failed to create achievement notifications for note event", error);
      });
    }

    if (events.streakBroken.happened) {
      await createNotification({
        userId: authResult.userId,
        type: "system",
        title: "Streak broken",
        message: `You lost a ${events.streakBroken.previous}-day streak. Restart today.`,
        actionUrl: "/dashboard"
      }).catch((error) => {
        console.error("Failed to create streak-break notification for note event", error);
      });

      if (authResult.session?.user?.email) {
        await sendStreakBrokenEmail(authResult.session.user.email, events.streakBroken.previous).catch((error) => {
          console.error("Failed to send streak-break email for note event", error);
          return null;
        });
      }
    }

    if (events.streakMilestone.happened && events.streakMilestone.milestone) {
      await createNotification({
        userId: authResult.userId,
        type: "system",
        title: `${events.streakMilestone.milestone}-day streak reached`,
        message: `You extended your streak to ${events.streakMilestone.milestone} days.`,
        actionUrl: "/dashboard/track"
      }).catch((error) => {
        console.error("Failed to create streak-milestone notification for note event", error);
      });
    }

    if (authResult.session?.user?.email && (events.newAchievements.length || events.streakMilestone.happened)) {
      const emailTasks = [
        ...(events.streakMilestone.happened && events.streakMilestone.milestone
          ? [sendStreakMilestoneEmail(authResult.session.user.email!, events.streakMilestone.milestone)]
          : []),
        ...events.newAchievements.map((achievement) =>
          sendAchievementEmail(authResult.session!.user!.email!, achievement.title, achievement.description)
        )
      ];

      await Promise.all(emailTasks).catch((error) => {
        console.error("Failed to send achievement emails for note event", error);
        return null;
      });
    }

    return NextResponse.json({ success: true, note, events, visuals });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Note generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

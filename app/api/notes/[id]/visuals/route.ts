import { NextResponse } from "next/server";
import { z } from "zod";
import { applyRouteRateLimit, requireUser } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { extractNoteDiagramPlaceholders } from "@/lib/note-content";
import { generateNoteVisual } from "@/lib/note-visuals";
import { NoteModel } from "@/models/Note";
import type { NoteVisual } from "@/types";

const schema = z.object({
  keys: z.array(z.string().min(1)).max(8).optional(),
  regenerate: z.boolean().optional()
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`note-visuals:${authResult.userId}`);
  if (rate) return rate;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await connectToDatabase();
  const note = await NoteModel.findOne({ _id: params.id, userId: authResult.userId });
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const placeholders = extractNoteDiagramPlaceholders(note.content).slice(0, 8);
  if (!placeholders.length) {
    return NextResponse.json({ visuals: note.visuals ?? [], generated: 0, missing: 0 });
  }

  const requestedKeys = parsed.data.keys ? new Set(parsed.data.keys) : null;
  const visualsByKey = new Map<string, NoteVisual>();
  for (const visual of (note.visuals ?? []) as Array<NoteVisual & { generatedAt: string | Date }>) {
    visualsByKey.set(visual.key, {
      ...visual,
      generatedAt: new Date(visual.generatedAt).toISOString()
    });
  }

  let generated = 0;
  for (const placeholder of placeholders) {
    if (requestedKeys && !requestedKeys.has(placeholder.key)) {
      continue;
    }
    if (!parsed.data.regenerate && visualsByKey.has(placeholder.key)) {
      continue;
    }

    try {
      const visual = await generateNoteVisual({
        noteId: note._id.toString(),
        key: placeholder.key,
        subject: note.subject,
        title: note.title,
        description: placeholder.description
      });
      if (visual) {
        visualsByKey.set(placeholder.key, visual);
        generated += 1;
      }
    } catch (error) {
      console.error("Failed to generate note visual", {
        noteId: note._id.toString(),
        key: placeholder.key,
        error
      });
    }
  }

  const orderedVisuals = placeholders
    .map((placeholder) => visualsByKey.get(placeholder.key))
    .filter((visual): visual is NoteVisual => Boolean(visual));

  note.visuals = orderedVisuals.map((visual) => ({
    ...visual,
    generatedAt: new Date(visual.generatedAt)
  }));

  if (generated > 0) {
    await note.save();
  }

  return NextResponse.json({
    visuals: orderedVisuals,
    generated,
    missing: Math.max(placeholders.length - orderedVisuals.length, 0)
  });
}

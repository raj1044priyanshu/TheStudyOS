import { generateImageWithMetadata } from "@/lib/content-service";
import { uploadNoteVisualImage } from "@/lib/cloudinary";
import { NOTE_VISUAL_UNAVAILABLE_MESSAGE } from "@/lib/note-visual-copy";
import { renderDeterministicNoteVisual, shouldUseDeterministicNoteVisual } from "@/lib/note-visual-renderer";
import type { NoteVisual } from "@/types";

const NOTE_VISUAL_SYSTEM_PROMPT = `You create clean educational visuals for student study notes.
Return a single neat diagram or explanatory image on a bright white background.
Keep labels minimal, typed, and readable.
Avoid handwriting, notebook paper, torn edges, dark themes, clutter, or decorative mess.
Prefer textbook-style clarity over artistic flair.
If the request is weak or ambiguous, still keep the composition simple and safe.`;

function buildNoteVisualPrompt({
  subject,
  title,
  description
}: {
  subject: string;
  title: string;
  description: string;
}) {
  return `Create one clean study visual for a student note.
Subject: ${subject}
Topic: ${title}
Requested visual: ${description}

Requirements:
- bright background
- clean textbook-style composition
- readable labels only where needed
- no handwritten marks
- no notebook or paper texture
- no messy arrows or overlapping text
- educational and student-friendly`;
}

export async function generateNoteVisual({
  noteId,
  key,
  subject,
  title,
  description,
  userId
}: {
  noteId: string;
  key: string;
  subject: string;
  title: string;
  description: string;
  userId?: string;
}): Promise<NoteVisual | null> {
  if (shouldUseDeterministicNoteVisual(description)) {
    const rendered = renderDeterministicNoteVisual({
      subject,
      title,
      description
    });
    const uploaded = await uploadNoteVisualImage({
      base64Data: rendered.data,
      mimeType: rendered.mimeType,
      noteId,
      key
    });

    return {
      key,
      description,
      imageUrl: uploaded.secure_url,
      provider: rendered.provider,
      model: rendered.model,
      generatedAt: new Date().toISOString()
    };
  }

  const generated = await generateImageWithMetadata(buildNoteVisualPrompt({ subject, title, description }), NOTE_VISUAL_SYSTEM_PROMPT, {
    route: "notes:visuals",
    userId,
    entityType: "note",
    entityId: noteId
  });

  if (!generated.data || !generated.mimeType.startsWith("image/")) {
    return null;
  }

  const uploaded = await uploadNoteVisualImage({
    base64Data: generated.data,
    mimeType: generated.mimeType,
    noteId,
    key
  });

  return {
    key,
    description,
    imageUrl: uploaded.secure_url,
    provider: generated.provider,
    model: generated.model,
    generatedAt: new Date().toISOString()
  };
}

export function normalizeNoteVisualErrorMessage(error: unknown) {
  void error;
  return NOTE_VISUAL_UNAVAILABLE_MESSAGE;
}

export function summarizeNoteVisualErrors(messages: string[], failureCount: number) {
  const uniqueMessages = Array.from(new Set(messages.filter(Boolean)));
  const primaryMessage = uniqueMessages[0] || NOTE_VISUAL_UNAVAILABLE_MESSAGE;

  void failureCount;
  return primaryMessage;
}

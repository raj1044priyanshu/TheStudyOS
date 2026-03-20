import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { NoteModel } from "@/models/Note";

const patchSchema = z.object({
  isFavorite: z.boolean().optional(),
  stickyNoteText: z.string().min(1).optional(),
  stickyNoteColor: z.enum(["yellow", "pink", "blue"]).optional()
});

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;
  const rate = await applyRouteRateLimit(`note:${authResult.userId}`);
  if (rate) return rate;

  await connectToDatabase();
  const note = await NoteModel.findOne({ _id: params.id, userId: authResult.userId }).lean();
  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ note });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  await connectToDatabase();
  const payload = patchSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.flatten() }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof payload.data.isFavorite === "boolean") {
    update.isFavorite = payload.data.isFavorite;
  }

  if (payload.data.stickyNoteText) {
    const color = payload.data.stickyNoteColor ?? "yellow";
    const tag = color === "pink" ? "STICKY_PINK" : color === "blue" ? "STICKY_BLUE" : "STICKY_YELLOW";
    const note = await NoteModel.findOne({ _id: params.id, userId: authResult.userId });
    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const appended = `${note.content.trim()}\n[${tag}] ${payload.data.stickyNoteText.trim()} [/${tag}]`;
    note.content = appended;
    note.htmlContent = `${note.htmlContent.trim()}\n[${tag}] ${payload.data.stickyNoteText.trim()} [/${tag}]`;
    if (typeof payload.data.isFavorite === "boolean") {
      note.isFavorite = payload.data.isFavorite;
    }
    await note.save();
    return NextResponse.json({ note });
  }

  const note = await NoteModel.findOneAndUpdate({ _id: params.id, userId: authResult.userId }, { $set: update }, { new: true }).lean();

  if (!note) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ note });
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  await connectToDatabase();
  await NoteModel.deleteOne({ _id: params.id, userId: authResult.userId });
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, applyRouteRateLimit } from "@/lib/api";
import { NoteModel } from "@/models/Note";

const patchSchema = z.object({
  isFavorite: z.boolean().optional()
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

  const note = await NoteModel.findOneAndUpdate(
    { _id: params.id, userId: authResult.userId },
    { $set: payload.data },
    { new: true }
  ).lean();

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

import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { connectToDatabase } from "@/lib/mongodb";
import { NoteModel } from "@/models/Note";

export default async function DashboardNotePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    notFound();
  }

  await connectToDatabase();
  const note = await NoteModel.findOne({ _id: params.id, userId: session.user.id }).lean();
  if (!note) {
    notFound();
  }

  return (
    <NoteViewer
      noteId={note._id.toString()}
      title={note.title}
      subject={note.subject}
      createdAt={new Date(note.createdAt).toISOString()}
      content={note.content}
      visuals={(note.visuals ?? []).map(
        (visual: { key: string; description: string; imageUrl: string; provider: string; model: string; generatedAt: Date | string }) => ({
          ...visual,
          generatedAt: new Date(visual.generatedAt).toISOString()
        })
      )}
    />
  );
}

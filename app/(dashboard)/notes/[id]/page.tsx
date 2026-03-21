import { redirect } from "next/navigation";

export default function NotePage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/notes/${params.id}`);
}

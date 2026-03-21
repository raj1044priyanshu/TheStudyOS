import { redirect } from "next/navigation";

export default function QuizAutopsyPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/quiz/${params.id}/autopsy`);
}

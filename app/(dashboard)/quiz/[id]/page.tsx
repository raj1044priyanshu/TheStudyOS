import { redirect } from "next/navigation";

export default function QuizPlayPage({ params }: { params: { id: string } }) {
  redirect(`/dashboard/quiz/${params.id}`);
}

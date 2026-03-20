import { AutopsyReport } from "@/components/quiz/AutopsyReport";

export default function QuizAutopsyPage({ params }: { params: { id: string } }) {
  return <AutopsyReport quizId={params.id} />;
}

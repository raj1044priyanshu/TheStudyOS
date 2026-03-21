import { AutopsyReport } from "@/components/quiz/AutopsyReport";

export default function DashboardQuizAutopsyPage({ params }: { params: { id: string } }) {
  return <AutopsyReport quizId={params.id} />;
}

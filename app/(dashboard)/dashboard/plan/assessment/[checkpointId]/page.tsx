import { PlannerAssessmentExperience } from "@/components/planner/PlannerAssessmentExperience";

export default function DashboardPlannerAssessmentPage({ params }: { params: { checkpointId: string } }) {
  return <PlannerAssessmentExperience checkpointId={params.checkpointId} />;
}

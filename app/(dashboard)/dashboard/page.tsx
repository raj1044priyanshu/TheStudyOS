import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { DailyBrief } from "@/components/dashboard/DailyBrief";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DailyBrief />
      <DashboardHome />
    </div>
  );
}

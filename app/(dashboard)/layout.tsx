import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ActiveStudyTracker } from "@/components/layout/ActiveStudyTracker";
import { DashboardTransition } from "@/components/layout/DashboardTransition";
import { MobileNav } from "@/components/layout/MobileNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { connectToDatabase } from "@/lib/mongodb";
import { getLevelFromXp, getProgressToNextLevel } from "@/lib/xp";
import { UserModel } from "@/models/User";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).lean();
  if (user?.welcomeScreenSeen === false) {
    redirect("/welcome");
  }
  const shouldStartTour = !(user?.isTourShown ?? false);
  const totalXp = user?.totalXP ?? user?.xp ?? 0;
  const level = getLevelFromXp(totalXp);

  return (
    <div className="app-shell-bg min-h-screen">
      <OfflineBanner />
      <div className="flex">
        <Sidebar user={session.user} />
        <div className="min-h-screen min-w-0 flex-1 pb-24 md:pb-0">
          <Topbar
            streak={user?.streak ?? 0}
            level={level.level}
            levelName={level.name}
            levelIcon={level.icon}
            xp={totalXp}
            progressToNextLevel={getProgressToNextLevel(totalXp)}
            user={session.user}
          />
          <div className="mx-auto w-full max-w-[1320px] p-4 md:p-6">
            <DashboardTransition>{children}</DashboardTransition>
          </div>
        </div>
      </div>

      <MobileNav />
      <GuidedTour enabled={shouldStartTour} />
      <ActiveStudyTracker />
    </div>
  );
}

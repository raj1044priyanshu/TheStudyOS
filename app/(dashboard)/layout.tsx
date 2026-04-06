import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthSuccessTracker } from "@/components/analytics/AuthSuccessTracker";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ActiveStudyTracker } from "@/components/layout/ActiveStudyTracker";
import { DashboardTransition } from "@/components/layout/DashboardTransition";
import { MobileNav } from "@/components/layout/MobileNav";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { ContextualHintsManager } from "@/components/help/ContextualHintsManager";
import { TourManager } from "@/components/onboarding/TourManager";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { connectToDatabase } from "@/lib/mongodb";
import { getLevelFromXp, getProgressToNextLevel } from "@/lib/xp";
import { UserModel } from "@/models/User";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).lean();
  if (user?.status === "suspended") {
    redirect("/suspended");
  }
  if (!user?.onboardingCompleted) {
    redirect("/onboarding");
  }
  const totalXp = user?.totalXP ?? user?.xp ?? 0;
  const level = getLevelFromXp(totalXp);

  return (
    <AuthSessionProvider session={session}>
      <AuthSuccessTracker fallbackDestination="/dashboard" />
      <div id="top" className="app-shell-bg min-h-screen">
        <OfflineBanner />
        <div className="flex">
          <Sidebar user={session.user} isAdmin={user?.role === "admin"} />
          <div className="min-h-screen min-w-0 flex-1 pb-24 md:pb-0">
            <Topbar
              streak={user?.streak ?? 0}
              level={level.level}
              levelName={level.name}
              levelIcon={level.icon}
              xp={totalXp}
              progressToNextLevel={getProgressToNextLevel(totalXp)}
              studyStyle={user?.studyProfile?.studyStyle ?? ""}
              user={session.user}
            />
            <div className="mx-auto w-full max-w-[1360px] px-3 pb-24 pt-3 sm:px-4 sm:pb-28 md:px-6 md:pb-6">
              <DashboardTransition>{children}</DashboardTransition>
            </div>
          </div>
        </div>

        <MobileNav />
        <TourManager />
        <Suspense fallback={null}>
          <ContextualHintsManager />
        </Suspense>
        <ActiveStudyTracker />
      </div>
    </AuthSessionProvider>
  );
}

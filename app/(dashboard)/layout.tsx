import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ActiveStudyTracker } from "@/components/layout/ActiveStudyTracker";
import { DashboardTransition } from "@/components/layout/DashboardTransition";
import { MobileNav } from "@/components/layout/MobileNav";
import { GuidedTour } from "@/components/onboarding/GuidedTour";
import { connectToDatabase } from "@/lib/mongodb";
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

  return (
    <div className="app-shell-bg min-h-screen">
      <div className="flex">
        <Sidebar user={session.user} />
        <div className="min-h-screen min-w-0 flex-1 pb-24 md:pb-0">
          <Topbar streak={user?.streak ?? 0} level={user?.level ?? 1} xp={user?.xp ?? 0} user={session.user} />
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

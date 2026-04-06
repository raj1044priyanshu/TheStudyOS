import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthSuccessTracker } from "@/components/analytics/AuthSuccessTracker";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";
import { ExamModel } from "@/models/Exam";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: {
    index: false,
    follow: false
  }
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDatabase();
  const [user, exams] = await Promise.all([
    UserModel.findById(session.user.id)
      .select("name onboardingCompleted onboardingStep studyProfile welcomeScreenSeen isTourShown status")
      .lean(),
    ExamModel.find({ userId: session.user.id }).sort({ examDate: 1 }).select("subject examName examDate board").lean()
  ]);

  if (!user) {
    redirect("/login");
  }

  if (user.status === "suspended") {
    redirect("/suspended");
  }

  if (user.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <>
      <AuthSuccessTracker fallbackDestination="/onboarding" />
      <OnboardingWizard
        name={user.name ?? session.user.name ?? "Student"}
        initialStep={user.onboardingStep ?? 0}
        initialProfile={user.studyProfile ?? {}}
        existingExams={exams.map((exam) => ({
          _id: exam._id.toString(),
          subject: exam.subject,
          examName: exam.examName,
          examDate: new Date(exam.examDate).toISOString(),
          board: exam.board ?? undefined
        }))}
      />
    </>
  );
}

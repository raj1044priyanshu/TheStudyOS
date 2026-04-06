import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export const metadata: Metadata = {
  title: "Welcome",
  robots: {
    index: false,
    follow: false
  }
};

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).select("onboardingCompleted status").lean();
  if (user?.status === "suspended") {
    redirect("/suspended");
  }
  redirect(user?.onboardingCompleted ? "/dashboard" : "/onboarding");
}

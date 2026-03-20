import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { WelcomeExperience } from "@/components/onboarding/WelcomeExperience";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export default async function WelcomePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).select("name welcomeScreenSeen").lean();

  if (user?.welcomeScreenSeen !== false) {
    redirect("/dashboard");
  }

  return <WelcomeExperience name={user?.name ?? session.user.name ?? "Student"} />;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuthSuccessTracker } from "@/components/analytics/AuthSuccessTracker";
import { AdminShell } from "@/components/admin/AdminShell";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDatabase();
  const user = await UserModel.findById(session.user.id).select("name email image role status").lean();

  if (!user) {
    redirect("/login");
  }

  if (user.status === "suspended") {
    redirect("/suspended");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <AuthSessionProvider session={session}>
      <AuthSuccessTracker fallbackDestination="/admin" />
      <AdminShell
        user={{
          name: user.name,
          email: user.email,
          image: user.image
        }}
      >
        {children}
      </AdminShell>
    </AuthSessionProvider>
  );
}

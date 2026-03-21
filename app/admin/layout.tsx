import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

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
    <AdminShell
      user={{
        name: user.name,
        email: user.email,
        image: user.image
      }}
    >
      {children}
    </AdminShell>
  );
}

import { AdminFeedback } from "@/components/admin/AdminFeedback";

export default function AdminFeedbackPage({
  searchParams
}: {
  searchParams?: { userId?: string };
}) {
  return <AdminFeedback initialUserId={searchParams?.userId ?? ""} />;
}

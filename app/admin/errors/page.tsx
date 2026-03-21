import { AdminErrors } from "@/components/admin/AdminErrors";

export default function AdminErrorsPage({
  searchParams
}: {
  searchParams?: { userId?: string };
}) {
  return <AdminErrors initialUserId={searchParams?.userId ?? ""} />;
}

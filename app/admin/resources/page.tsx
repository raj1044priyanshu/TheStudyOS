import { AdminResources } from "@/components/admin/AdminResources";
import { ADMIN_RESOURCE_OPTIONS } from "@/lib/admin/resources";

export default function AdminResourcesPage({
  searchParams
}: {
  searchParams?: { resource?: string; userId?: string };
}) {
  const initialResource = searchParams?.resource && ADMIN_RESOURCE_OPTIONS.some((item) => item.value === searchParams.resource)
    ? searchParams.resource
    : ADMIN_RESOURCE_OPTIONS[0]?.value ?? "users";

  return (
    <AdminResources
      resourceOptions={ADMIN_RESOURCE_OPTIONS}
      initialResource={initialResource}
      initialUserId={searchParams?.userId ?? ""}
    />
  );
}

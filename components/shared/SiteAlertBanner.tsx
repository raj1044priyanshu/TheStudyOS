import { getCachedPublicAppSettings } from "@/lib/app-settings";

export async function SiteAlertBanner() {
  const settings = await getCachedPublicAppSettings();

  if (!settings.maintenanceBanner.enabled) {
    return null;
  }

  return (
    <div className="border-b border-[color:var(--panel-border)] bg-[color:var(--secondary-button-bg)] px-4 py-3 text-center text-sm text-[var(--foreground)]">
      <span className="font-medium">Notice:</span> {settings.maintenanceBanner.message}
    </div>
  );
}

"use client";

import { IconCheck, IconWifiOff } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);
  const message = useMemo(
    () =>
      isOffline
        ? "You're offline — showing cached content. Some features are unavailable."
        : "Back online. Syncing...",
    [isOffline]
  );

  useEffect(() => {
    let onlineTimeout: number | null = null;

    async function syncPendingActions() {
      window.dispatchEvent(new CustomEvent("studyos:sync-pending-actions"));
    }

    const handleOffline = () => {
      if (onlineTimeout) window.clearTimeout(onlineTimeout);
      setIsOffline(true);
      setShowBackOnline(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowBackOnline(true);
      void syncPendingActions();
      onlineTimeout = window.setTimeout(() => setShowBackOnline(false), 2500);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      if (onlineTimeout) window.clearTimeout(onlineTimeout);
    };
  }, []);

  if (!isOffline && !showBackOnline) {
    return null;
  }

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[90] flex h-9 items-center justify-center px-4 text-center text-xs font-medium"
      style={{
        backgroundColor: isOffline ? "#FCD34D" : "#BBF7D0",
        color: "#1C1B29"
      }}
    >
      <span className="mr-2 inline-flex">
        {isOffline ? <IconWifiOff className="h-4 w-4" /> : <IconCheck className="h-4 w-4" />}
      </span>
      {message}
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SIGN_IN_PENDING_KEY, trackEvent } from "@/lib/analytics";

interface Props {
  fallbackDestination: string;
}

export function AuthSuccessTracker({ fallbackDestination }: Props) {
  const pathname = usePathname();

  useEffect(() => {
    const destination = window.sessionStorage.getItem(SIGN_IN_PENDING_KEY);
    if (!destination) {
      return;
    }

    trackEvent("sign_in_success", {
      destination: pathname || fallbackDestination
    });
    window.sessionStorage.removeItem(SIGN_IN_PENDING_KEY);
  }, [fallbackDestination, pathname]);

  return null;
}

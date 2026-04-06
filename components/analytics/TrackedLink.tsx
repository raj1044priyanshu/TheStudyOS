"use client";

import Link, { type LinkProps } from "next/link";
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { trackEvent } from "@/lib/analytics";

type CtaTracking = {
  event: "cta_click";
  params: {
    location: string;
    label: string;
    destination?: string;
  };
};

type Props = LinkProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    tracking?: CtaTracking;
  };

export const TrackedLink = forwardRef<HTMLAnchorElement, Props>(function TrackedLink({ tracking, onClick, ...props }, ref) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (!event.defaultPrevented && tracking) {
      trackEvent(tracking.event, tracking.params);
    }
  }

  return <Link ref={ref} {...props} onClick={handleClick} />;
});

TrackedLink.displayName = "TrackedLink";

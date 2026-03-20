"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export const floatingPanelClassName =
  "glass-modal overflow-hidden rounded-[24px] border border-[color:var(--panel-border)] p-2 shadow-[var(--glass-shadow-deep)]";

export const floatingPanelScrollAreaClassName = "min-h-0 overflow-y-auto pr-1 scrollbar-thin";

export type FloatingPanelProps = React.HTMLAttributes<HTMLDivElement>;

const FloatingPanel = React.forwardRef<HTMLDivElement, FloatingPanelProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(floatingPanelClassName, className)} {...props} />
));

FloatingPanel.displayName = "FloatingPanel";

const FloatingPanelScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(floatingPanelScrollAreaClassName, className)} {...props} />
));

FloatingPanelScrollArea.displayName = "FloatingPanelScrollArea";

export { FloatingPanel, FloatingPanelScrollArea };

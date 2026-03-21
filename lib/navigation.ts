import { WORKFLOW_NAV_ITEMS, WORKFLOW_PHASES, type WorkflowNavItem } from "@/lib/study-flow";
import type { StudyWorkflowPhase } from "@/types";

export type AppNavItem = WorkflowNavItem;
export interface AppNavSection {
  phase: StudyWorkflowPhase;
  label: string;
  accent: string;
  description: string;
  items: AppNavItem[];
}

export const APP_NAV_ITEMS: AppNavItem[] = WORKFLOW_NAV_ITEMS;
export const MOBILE_PRIMARY_NAV_ITEMS = APP_NAV_ITEMS.filter((item) => item.mobileSlot === "primary");
export const MOBILE_MORE_NAV_ITEMS = APP_NAV_ITEMS.filter((item) => item.mobileSlot === "more");

export const APP_NAV_SECTIONS: AppNavSection[] = WORKFLOW_PHASES.map((phase) => ({
  phase: phase.id,
  label: phase.label,
  accent: phase.accent,
  description: phase.description,
  items: APP_NAV_ITEMS.filter((item) => item.phase === phase.id)
}));

export function getBaseNavRoute(path?: string | null) {
  if (!path) {
    return null;
  }

  const [segment] = path.split("/").filter(Boolean);
  return segment ? `/${segment}` : "/";
}

export function getNavItemForRoute(path?: string | null) {
  const baseRoute = getBaseNavRoute(path);
  if (!baseRoute) {
    return null;
  }

  return APP_NAV_ITEMS.find((item) => item.href === baseRoute) ?? null;
}

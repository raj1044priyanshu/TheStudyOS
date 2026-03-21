import {
  IconBook2,
  IconBrain,
  IconCalendarWeek,
  IconChartBar,
  IconDashboard,
  IconRepeat,
  IconUser,
  IconUsers
} from "@tabler/icons-react";
import type { HubPhase, HubToolId } from "@/types";

type NavIcon = typeof IconDashboard;
type MobileNavKey = "dashboard" | "plan" | "study" | "test";

export interface HubNavItem {
  key: "dashboard" | HubPhase | "profile";
  label: string;
  href: string;
  icon: NavIcon;
  tooltip?: string;
}

export const HUB_NAV_ITEMS: HubNavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: IconDashboard },
  { key: "plan", label: "Plan", href: "/dashboard/plan", icon: IconCalendarWeek, tooltip: "Organise your time and exams" },
  { key: "study", label: "Study", href: "/dashboard/study", icon: IconBook2, tooltip: "Learn new topics" },
  { key: "test", label: "Test", href: "/dashboard/test", icon: IconBrain, tooltip: "Check what you know" },
  { key: "revise", label: "Revise", href: "/dashboard/revise", icon: IconRepeat, tooltip: "Make sure you never forget" },
  { key: "track", label: "Track", href: "/dashboard/track", icon: IconChartBar, tooltip: "See your growth" },
  { key: "profile", label: "Profile", href: "/dashboard/profile", icon: IconUser }
];

export const MOBILE_PRIMARY_NAV_ITEMS = HUB_NAV_ITEMS.filter((item) =>
  ["dashboard", "plan", "study", "test"].includes(item.key)
) as Array<HubNavItem & { key: MobileNavKey }>;

export const MOBILE_MORE_NAV_ITEMS: Array<{ key: string; label: string; href: string; icon: NavIcon }> = [
  { key: "revise", label: "Revise", href: "/dashboard/revise", icon: IconRepeat },
  { key: "track", label: "Track", href: "/dashboard/track", icon: IconChartBar },
  { key: "profile", label: "Profile", href: "/dashboard/profile", icon: IconUser },
  { key: "study-room", label: "Study Room", href: "/dashboard/study-room", icon: IconUsers }
];

export const DEFAULT_HUB_TOOLS: Record<Exclude<HubPhase, "track">, HubToolId> = {
  plan: "planner",
  study: "notes",
  test: "quiz",
  revise: "revision-queue"
};

export const HUB_TOOL_IDS: Record<Exclude<HubPhase, "track">, HubToolId[]> = {
  plan: ["planner", "exams", "daily-brief"],
  study: ["notes", "doubts", "focus-room", "videos", "scanner"],
  test: ["quiz", "flashcards", "teach-me", "evaluator", "past-papers"],
  revise: ["revision-queue", "formula-sheet", "mind-maps", "knowledge-graph"]
};

export const LEGACY_HUB_REDIRECTS: Record<string, string> = {
  "/notes": "/dashboard/study?tool=notes",
  "/doubts": "/dashboard/study?tool=doubts",
  "/focus": "/dashboard/study?tool=focus-room",
  "/videos": "/dashboard/study?tool=videos",
  "/scanner": "/dashboard/study?tool=scanner",
  "/quiz": "/dashboard/test?tool=quiz",
  "/flashcards": "/dashboard/test?tool=flashcards",
  "/teach-me": "/dashboard/test?tool=teach-me",
  "/evaluator": "/dashboard/test?tool=evaluator",
  "/past-papers": "/dashboard/test?tool=past-papers",
  "/planner": "/dashboard/plan?tool=planner",
  "/exams": "/dashboard/plan?tool=exams",
  "/revision": "/dashboard/revise?tool=revision-queue",
  "/formula-sheet": "/dashboard/revise?tool=formula-sheet",
  "/mindmap": "/dashboard/revise?tool=mind-maps",
  "/progress": "/dashboard/track"
};

export function getHubHref(phase: HubPhase, tool?: HubToolId) {
  const base = `/dashboard/${phase}`;
  return tool ? `${base}?tool=${encodeURIComponent(tool)}` : base;
}

export function mergeHrefWithSearch(
  href: string,
  searchParams?: Record<string, string | string[] | undefined>
) {
  if (!searchParams) {
    return href;
  }

  const [pathname, existingQuery = ""] = href.split("?");
  const params = new URLSearchParams(existingQuery);

  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
      return;
    }

    params.set(key, value);
  });

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function normalizeHubTool(phase: Exclude<HubPhase, "track">, tool: string | null | undefined) {
  const fallback = DEFAULT_HUB_TOOLS[phase];
  if (!tool) {
    return fallback;
  }

  return HUB_TOOL_IDS[phase].includes(tool as HubToolId) ? (tool as HubToolId) : fallback;
}

export function getHubNavKey(pathname: string) {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/dashboard/plan")) return "plan";
  if (pathname.startsWith("/dashboard/study")) return "study";
  if (pathname.startsWith("/dashboard/test")) return "test";
  if (pathname.startsWith("/dashboard/revise")) return "revise";
  if (pathname.startsWith("/dashboard/track")) return "track";
  if (pathname.startsWith("/dashboard/profile")) return "profile";
  if (pathname.startsWith("/dashboard/notes/")) return "study";
  if (pathname.startsWith("/dashboard/quiz/")) return "test";
  if (pathname.startsWith("/dashboard/knowledge-graph")) return "revise";
  if (pathname.startsWith("/dashboard/mindmap")) return "revise";
  if (pathname.startsWith("/dashboard/study-room")) return "dashboard";
  return null;
}

export function getTopbarMeta(pathname: string) {
  if (pathname === "/dashboard") {
    return { eyebrow: "Workspace", title: "Dashboard", breadcrumb: null as { label: string; href: string } | null };
  }
  if (pathname === "/dashboard/plan") {
    return { eyebrow: "Phase Hub", title: "Plan", breadcrumb: null };
  }
  if (pathname === "/dashboard/study") {
    return { eyebrow: "Phase Hub", title: "Study", breadcrumb: null };
  }
  if (pathname === "/dashboard/test") {
    return { eyebrow: "Phase Hub", title: "Test", breadcrumb: null };
  }
  if (pathname === "/dashboard/revise") {
    return { eyebrow: "Phase Hub", title: "Revise", breadcrumb: null };
  }
  if (pathname === "/dashboard/track") {
    return { eyebrow: "Phase Hub", title: "Track", breadcrumb: null };
  }
  if (pathname === "/dashboard/profile") {
    return { eyebrow: "Account", title: "Profile", breadcrumb: null };
  }
  if (pathname.startsWith("/dashboard/notes/")) {
    return { eyebrow: "Study", title: "Note Viewer", breadcrumb: { label: "Study", href: getHubHref("study", "notes") } };
  }
  if (pathname.startsWith("/dashboard/quiz/") && pathname.endsWith("/autopsy")) {
    return { eyebrow: "Test", title: "Exam Autopsy", breadcrumb: { label: "Test", href: getHubHref("test", "quiz") } };
  }
  if (pathname.startsWith("/dashboard/quiz/")) {
    return { eyebrow: "Test", title: "Quiz Session", breadcrumb: { label: "Test", href: getHubHref("test", "quiz") } };
  }
  if (pathname.startsWith("/dashboard/knowledge-graph")) {
    return { eyebrow: "Revise", title: "Knowledge Graph", breadcrumb: { label: "Revise", href: getHubHref("revise", "knowledge-graph") } };
  }
  if (pathname.startsWith("/dashboard/mindmap")) {
    return { eyebrow: "Revise", title: "Mind Map", breadcrumb: { label: "Revise", href: getHubHref("revise", "mind-maps") } };
  }
  if (pathname.startsWith("/dashboard/study-room")) {
    return { eyebrow: "Workspace", title: "Study Room", breadcrumb: { label: "Dashboard", href: "/dashboard" } };
  }

  return { eyebrow: "StudyOS", title: "StudyOS", breadcrumb: null };
}

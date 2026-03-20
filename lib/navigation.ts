import {
  IconBook2,
  IconBrain,
  IconCalculator,
  IconCamera,
  IconCalendarWeek,
  IconChartBar,
  IconClock,
  IconDashboard,
  IconFileCheck,
  IconFileSearch,
  IconHelpCircle,
  IconLayoutKanban,
  IconNetwork,
  IconPlayerPlay,
  IconRotateClockwise,
  IconSchool,
  IconTopologyStar3,
  IconUser,
  IconUsers
} from "@tabler/icons-react";

type NavIcon = typeof IconDashboard;

export type MobileNavSlot = "primary" | "more";

export interface AppNavItem {
  href: string;
  label: string;
  icon: NavIcon;
  tourId: string;
  mobileSlot: MobileNavSlot;
}

export const APP_NAV_ITEMS: AppNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: IconDashboard, tourId: "nav-dashboard", mobileSlot: "primary" },
  { href: "/notes", label: "Notes", icon: IconBook2, tourId: "nav-notes", mobileSlot: "primary" },
  { href: "/doubts", label: "Doubts", icon: IconHelpCircle, tourId: "nav-doubts", mobileSlot: "primary" },
  { href: "/planner", label: "Planner", icon: IconCalendarWeek, tourId: "nav-planner", mobileSlot: "more" },
  { href: "/quiz", label: "Quiz", icon: IconBrain, tourId: "nav-quiz", mobileSlot: "primary" },
  { href: "/flashcards", label: "Flashcards", icon: IconLayoutKanban, tourId: "nav-flashcards", mobileSlot: "more" },
  { href: "/focus", label: "Focus Room", icon: IconClock, tourId: "nav-focus", mobileSlot: "more" },
  { href: "/scanner", label: "Scanner", icon: IconCamera, tourId: "nav-scanner", mobileSlot: "more" },
  { href: "/knowledge-graph", label: "Knowledge", icon: IconNetwork, tourId: "nav-knowledge", mobileSlot: "more" },
  { href: "/formula-sheet", label: "Formula Sheet", icon: IconCalculator, tourId: "nav-formula-sheet", mobileSlot: "more" },
  { href: "/exams", label: "Exams", icon: IconCalendarWeek, tourId: "nav-exams", mobileSlot: "more" },
  { href: "/teach-me", label: "Teach Me", icon: IconSchool, tourId: "nav-teach-me", mobileSlot: "more" },
  { href: "/revision", label: "Revision", icon: IconRotateClockwise, tourId: "nav-revision", mobileSlot: "more" },
  { href: "/study-room", label: "Study Room", icon: IconUsers, tourId: "nav-study-room", mobileSlot: "more" },
  { href: "/evaluator", label: "Evaluator", icon: IconFileCheck, tourId: "nav-evaluator", mobileSlot: "more" },
  { href: "/past-papers", label: "Past Papers", icon: IconFileSearch, tourId: "nav-past-papers", mobileSlot: "more" },
  { href: "/videos", label: "Videos", icon: IconPlayerPlay, tourId: "nav-videos", mobileSlot: "more" },
  { href: "/mindmap", label: "Mind Map", icon: IconTopologyStar3, tourId: "nav-mindmap", mobileSlot: "more" },
  { href: "/progress", label: "Progress", icon: IconChartBar, tourId: "nav-progress", mobileSlot: "more" },
  { href: "/profile", label: "Profile", icon: IconUser, tourId: "nav-profile", mobileSlot: "more" }
];

export const MOBILE_PRIMARY_NAV_ITEMS = APP_NAV_ITEMS.filter((item) => item.mobileSlot === "primary");
export const MOBILE_MORE_NAV_ITEMS = APP_NAV_ITEMS.filter((item) => item.mobileSlot === "more");

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

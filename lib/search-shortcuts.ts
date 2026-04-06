export interface SearchShortcut {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  keywords: string[];
  phase: "dashboard" | "plan" | "study" | "test" | "revise" | "track" | "account";
}

export const SEARCH_SHORTCUTS: SearchShortcut[] = [
  {
    id: "dashboard",
    title: "Open Dashboard",
    subtitle: "Your control center for today, priorities, and quick starts.",
    href: "/dashboard",
    keywords: ["home", "today", "overview", "dashboard"],
    phase: "dashboard"
  },
  {
    id: "planner",
    title: "Study Planner",
    subtitle: "Build or update your day-by-day plan.",
    href: "/dashboard/plan?tool=planner",
    keywords: ["planner", "plan", "schedule", "timetable"],
    phase: "plan"
  },
  {
    id: "exams",
    title: "Exams & Countdown",
    subtitle: "Track exam dates, readiness, and crash plans.",
    href: "/dashboard/plan?tool=exams",
    keywords: ["exam", "countdown", "deadline", "panic plan"],
    phase: "plan"
  },
  {
    id: "daily-brief",
    title: "Daily Brief",
    subtitle: "See today’s plan, quote, and next best move.",
    href: "/dashboard/plan?tool=daily-brief",
    keywords: ["brief", "today", "daily"],
    phase: "plan"
  },
  {
    id: "notes",
    title: "Notes",
    subtitle: "Generate and revisit paper-style study notes.",
    href: "/dashboard/study?tool=notes",
    keywords: ["notes", "study note", "topic", "revision note"],
    phase: "study"
  },
  {
    id: "doubts",
    title: "Doubt Solver",
    subtitle: "Ask a question when one concept blocks the rest.",
    href: "/dashboard/study?tool=doubts",
    keywords: ["doubt", "question", "help", "explain"],
    phase: "study"
  },
  {
    id: "scanner",
    title: "Paper Scanner",
    subtitle: "Turn physical pages into digital study material.",
    href: "/dashboard/study?tool=scanner",
    keywords: ["scanner", "scan", "paper", "upload"],
    phase: "study"
  },
  {
    id: "videos",
    title: "Video Finder",
    subtitle: "Find visual explanations for difficult topics.",
    href: "/dashboard/study?tool=videos",
    keywords: ["video", "youtube", "lecture", "tutorial"],
    phase: "study"
  },
  {
    id: "focus-room",
    title: "Focus Room",
    subtitle: "Start a quiet timed study session.",
    href: "/dashboard/study?tool=focus-room",
    keywords: ["focus", "timer", "pomodoro", "session"],
    phase: "study"
  },
  {
    id: "quiz",
    title: "Quiz",
    subtitle: "Test what you remember right after studying.",
    href: "/dashboard/test?tool=quiz",
    keywords: ["quiz", "mcq", "practice", "test"],
    phase: "test"
  },
  {
    id: "flashcards",
    title: "Flashcards",
    subtitle: "Review short facts, formulas, and definitions fast.",
    href: "/dashboard/test?tool=flashcards",
    keywords: ["flashcards", "cards", "memorize", "memory"],
    phase: "test"
  },
  {
    id: "teach-me",
    title: "Teach Me",
    subtitle: "Explain a topic in your own words to test understanding.",
    href: "/dashboard/test?tool=teach-me",
    keywords: ["teach me", "explain back", "understanding"],
    phase: "test"
  },
  {
    id: "evaluator",
    title: "Essay Evaluator",
    subtitle: "Get feedback on long-form written answers.",
    href: "/dashboard/test?tool=evaluator",
    keywords: ["evaluator", "essay", "long answer", "feedback"],
    phase: "test"
  },
  {
    id: "past-papers",
    title: "Past Papers",
    subtitle: "Analyze previous papers and generate follow-up practice.",
    href: "/dashboard/test?tool=past-papers",
    keywords: ["past papers", "papers", "previous year", "pattern"],
    phase: "test"
  },
  {
    id: "revision-queue",
    title: "Revision Queue",
    subtitle: "See what is due for spaced repetition today.",
    href: "/dashboard/revise?tool=revision-queue",
    keywords: ["revision", "due", "spaced repetition", "review"],
    phase: "revise"
  },
  {
    id: "formula-sheet",
    title: "Formula Sheet",
    subtitle: "Review saved formulas and quick references.",
    href: "/dashboard/revise?tool=formula-sheet",
    keywords: ["formula", "sheet", "equation"],
    phase: "revise"
  },
  {
    id: "mind-maps",
    title: "Mind Maps",
    subtitle: "Map one topic to see its structure clearly.",
    href: "/dashboard/revise?tool=mind-maps",
    keywords: ["mind map", "map", "topic structure"],
    phase: "revise"
  },
  {
    id: "knowledge-graph",
    title: "Knowledge Graph",
    subtitle: "See how your concepts connect across topics.",
    href: "/dashboard/revise?tool=knowledge-graph",
    keywords: ["knowledge graph", "connections", "concepts"],
    phase: "revise"
  },
  {
    id: "track",
    title: "Track",
    subtitle: "Review streaks, weak topics, and progress trends.",
    href: "/dashboard/track",
    keywords: ["track", "progress", "streak", "stats"],
    phase: "track"
  },
  {
    id: "study-room",
    title: "Study Room",
    subtitle: "Collaborate with chat, whiteboard, timer, and quiz battles.",
    href: "/dashboard/study-room",
    keywords: ["study room", "group", "whiteboard", "friends"],
    phase: "study"
  },
  {
    id: "profile",
    title: "Profile & Achievements",
    subtitle: "See your profile, level, trophies, and account details.",
    href: "/dashboard/profile",
    keywords: ["profile", "achievements", "account", "level"],
    phase: "account"
  }
];

export function filterSearchShortcuts(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return SEARCH_SHORTCUTS;
  }

  return SEARCH_SHORTCUTS.filter((shortcut) => {
    const haystack = [shortcut.title, shortcut.subtitle, shortcut.phase, ...shortcut.keywords]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

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
  IconMicrophone,
  IconMicroscope,
  IconNetwork,
  IconPlayerPlay,
  IconRotateClockwise,
  IconSchool,
  IconSparkles,
  IconSun,
  IconTopologyStar3,
  IconUser,
  IconUsers,
  IconWifiOff
} from "@tabler/icons-react";
import type {
  ContextualHintId,
  HelpGoalAction,
  StudyStyle,
  StudyWorkflowFeatureGuide,
  StudyWorkflowPhase,
  TourPageName
} from "@/types";

type NavIcon = typeof IconDashboard;

export interface WorkflowNavItem {
  href: string;
  label: string;
  icon: NavIcon;
  mobileSlot: "primary" | "more" | "hidden";
  phase: StudyWorkflowPhase;
  helpDescription: string;
  whenToUse: string;
  tourId?: string;
}

export interface WorkflowPhaseDefinition {
  id: StudyWorkflowPhase;
  label: string;
  accent: string;
  description: string;
}

export interface WorkflowToolGroup {
  phase: Exclude<StudyWorkflowPhase, "today">;
  title: string;
  subtitle: string;
  color: string;
  tools: string[];
}

export const ONBOARDING_CLASS_OPTIONS = [
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
  "Undergraduate",
  "Competitive Exam Prep"
] as const;

export const ONBOARDING_BOARD_OPTIONS = ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "Other"] as const;
export const ONBOARDING_STREAM_OPTIONS = ["Science", "Commerce", "Humanities", "Other"] as const;

export const ONBOARDING_GOAL_OPTIONS = [
  "Board Exams",
  "Entrance Exams (JEE/NEET/etc)",
  "Competitive Exams (UPSC/etc)",
  "University Exams",
  "Self Learning"
] as const;

export const ONBOARDING_STYLE_OPTIONS: Array<{
  value: StudyStyle;
  emoji: string;
  title: string;
  description: string;
  tools: string[];
}> = [
  {
    value: "visual",
    emoji: "",
    title: "Visual Learner",
    description: "I understand things better with diagrams, mind maps, and color-coded notes.",
    tools: ["Notes Generator", "Mind Maps", "Concept Connector"]
  },
  {
    value: "reading",
    emoji: "",
    title: "Reading & Notes",
    description: "I like reading detailed explanations and making thorough notes.",
    tools: ["Notes Generator", "Formula Sheet", "Doubt Solver"]
  },
  {
    value: "practice",
    emoji: "",
    title: "Practice First",
    description: "I learn by doing — quizzes, problems, and testing myself.",
    tools: ["Quiz Generator", "Flashcards", "Teach Me Mode"]
  },
  {
    value: "mixed",
    emoji: "",
    title: "Mixed Approach",
    description: "I use a mix of everything depending on the topic.",
    tools: ["All features", "Daily Brief guidance", "Planner + revision"]
  }
];

export const WORKFLOW_PHASES: WorkflowPhaseDefinition[] = [
  { id: "today", label: "Today", accent: "#7B6CF6", description: "See what matters right now." },
  { id: "plan", label: "Plan", accent: "#60A5FA", description: "Turn exam pressure into a visible roadmap." },
  { id: "study", label: "Study", accent: "#8B5CF6", description: "Build understanding during your active study blocks." },
  { id: "test", label: "Test", accent: "#F59E0B", description: "Check what actually stuck after studying." },
  { id: "revise-track", label: "Revise & Track", accent: "#22C55E", description: "Keep concepts alive and spot your gaps." },
  { id: "more", label: "More", accent: "#F472B6", description: "Social, profile, and secondary tools." }
];

export const WORKFLOW_NAV_ITEMS: WorkflowNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: IconDashboard,
    mobileSlot: "primary",
    phase: "today",
    helpDescription: "Use this as your morning control center for the brief, countdowns, revision, and study stats.",
    whenToUse: "Start every study day here before opening any other tool."
  },
  {
    href: "/dashboard/plan?tool=planner",
    label: "Study Planner",
    icon: IconCalendarWeek,
    mobileSlot: "more",
    phase: "plan",
    helpDescription: "Use this to generate and follow your day-by-day study schedule.",
    whenToUse: "Set it up once per exam cycle and revisit it whenever your exams or availability changes."
  },
  {
    href: "/dashboard/plan?tool=exams",
    label: "Exams & Countdown",
    icon: IconCalendarWeek,
    mobileSlot: "more",
    phase: "plan",
    helpDescription: "Track how close your exams are and how ready you are for each one.",
    whenToUse: "Check this when you need urgency, readiness, or a crash revision plan."
  },
  {
    href: "/dashboard/revise?tool=revision-queue",
    label: "Revision Queue",
    icon: IconRotateClockwise,
    mobileSlot: "primary",
    phase: "plan",
    helpDescription: "See what needs review today using spaced repetition.",
    whenToUse: "Open this every day before starting new study."
  },
  {
    href: "/dashboard/study?tool=notes",
    label: "Notes",
    icon: IconBook2,
    mobileSlot: "primary",
    phase: "study",
    helpDescription: "Generate and revisit structured notes for any topic you need to study.",
    whenToUse: "Create a note before you quiz yourself on a topic."
  },
  {
    href: "/dashboard/study?tool=doubts",
    label: "Doubt Solver",
    icon: IconHelpCircle,
    mobileSlot: "more",
    phase: "study",
    helpDescription: "Ask focused questions when a concept still feels shaky.",
    whenToUse: "Use it mid-study whenever one idea is blocking the rest of the topic."
  },
  {
    href: "/dashboard/study?tool=scanner",
    label: "Paper Scanner",
    icon: IconCamera,
    mobileSlot: "more",
    phase: "study",
    helpDescription: "Turn textbook pages or handwritten notes into digital explanations.",
    whenToUse: "Use it when your study material is physical instead of already inside StudyOS."
  },
  {
    href: "/dashboard/study?tool=videos",
    label: "Video Finder",
    icon: IconPlayerPlay,
    mobileSlot: "more",
    phase: "study",
    helpDescription: "Find visual explanations when written notes are not enough.",
    whenToUse: "Use it for dense or abstract topics where seeing the process helps."
  },
  {
    href: "/dashboard/study?tool=focus-room",
    label: "Focus Room",
    icon: IconClock,
    mobileSlot: "more",
    phase: "study",
    helpDescription: "Run timed study sessions with a calm, distraction-free timer.",
    whenToUse: "Open it at the start of every planned study block."
  },
  {
    href: "/dashboard/test?tool=quiz",
    label: "Quiz",
    icon: IconBrain,
    mobileSlot: "primary",
    phase: "test",
    helpDescription: "Use this to test recall right after studying.",
    whenToUse: "Take a quiz on every topic within 24 hours of studying it."
  },
  {
    href: "/dashboard/test?tool=flashcards",
    label: "Flashcards",
    icon: IconLayoutKanban,
    mobileSlot: "more",
    phase: "test",
    helpDescription: "Memorize facts, dates, formulas, and definitions in short bursts.",
    whenToUse: "Best for quick revision and last-mile memory work."
  },
  {
    href: "/dashboard/test?tool=teach-me",
    label: "Teach Me",
    icon: IconSchool,
    mobileSlot: "more",
    phase: "test",
    helpDescription: "Explain a topic in your own words and see how well you truly understand it.",
    whenToUse: "Use it when recognition feels easy but true understanding still feels uncertain."
  },
  {
    href: "/dashboard/test?tool=evaluator",
    label: "Essay Evaluator",
    icon: IconFileCheck,
    mobileSlot: "more",
    phase: "test",
    helpDescription: "Get exam-style feedback on longer written answers.",
    whenToUse: "Use it for theory subjects, essays, and long-answer practice."
  },
  {
    href: "/dashboard/test?tool=past-papers",
    label: "Past Papers",
    icon: IconFileSearch,
    mobileSlot: "more",
    phase: "test",
    helpDescription: "Analyze paper patterns and predicted topics from uploaded exam papers.",
    whenToUse: "Use it once you have past papers and want pattern recognition, not just topic study."
  },
  {
    href: "/dashboard/revise?tool=formula-sheet",
    label: "Formula Sheet",
    icon: IconCalculator,
    mobileSlot: "more",
    phase: "revise-track",
    helpDescription: "Review collected formulas and definitions in one place.",
    whenToUse: "Check it before exams and after generating formula-heavy notes."
  },
  {
    href: "/dashboard/revise?tool=mind-maps",
    label: "Mind Maps — Plan a topic",
    icon: IconTopologyStar3,
    mobileSlot: "more",
    phase: "revise-track",
    helpDescription: "Map one topic before or during study to see its structure clearly.",
    whenToUse: "Use it when a chapter has many sub-concepts and you need the big picture first."
  },
  {
    href: "/dashboard/revise?tool=knowledge-graph",
    label: "Knowledge Graph — See all connections",
    icon: IconNetwork,
    mobileSlot: "more",
    phase: "revise-track",
    helpDescription: "See how the concepts you have already studied connect across notes and quizzes.",
    whenToUse: "Visit it after building up enough notes or quizzes to spot strengths and gaps."
  },
  {
    href: "/dashboard/track",
    label: "Track",
    icon: IconChartBar,
    mobileSlot: "more",
    phase: "revise-track",
    helpDescription: "Track streaks, weak topics, heatmaps, and overall study trends.",
    whenToUse: "Use it weekly to decide what needs more attention next."
  },
  {
    href: "/dashboard/study-room",
    label: "Group Study Room",
    icon: IconUsers,
    mobileSlot: "more",
    phase: "more",
    helpDescription: "Study live with friends using a shared timer, whiteboard, chat, and quiz battle.",
    whenToUse: "Best for collaborative weekend sessions or accountability with study partners."
  },
  {
    href: "/dashboard/profile",
    label: "Profile & Achievements",
    icon: IconUser,
    mobileSlot: "more",
    phase: "more",
    helpDescription: "See your level, trophies, study stats, and account settings.",
    whenToUse: "Use it to review milestones, progress trends, and profile settings."
  }
];

export const WORKFLOW_TOOL_GROUPS: WorkflowToolGroup[] = [
  {
    phase: "plan",
    title: "PLAN",
    subtitle: "Start here every week",
    color: "soft blue",
    tools: ["Study Planner", "Exam Countdown", "Daily Brief"]
  },
  {
    phase: "study",
    title: "STUDY",
    subtitle: "Your daily learning",
    color: "soft purple",
    tools: ["Notes Generator", "Doubt Solver", "Video Finder", "Paper Scanner", "Focus Room"]
  },
  {
    phase: "test",
    title: "TEST",
    subtitle: "Check what you've learned",
    color: "soft amber",
    tools: ["Quiz Generator", "Flashcards", "Teach Me Mode", "Essay Evaluator"]
  },
  {
    phase: "revise-track",
    title: "REVISE",
    subtitle: "Never forget what you studied",
    color: "soft green",
    tools: ["Smart Revision Scheduler", "Formula Sheet", "Mind Maps", "Concept Connector", "Simplifier Slider"]
  },
  {
    phase: "more",
    title: "TRACK",
    subtitle: "See your progress and improve",
    color: "soft pink",
    tools: ["Progress Dashboard", "Exam Autopsy", "Past Paper Analyzer", "Streak & Achievements", "Knowledge Graph"]
  }
];

export const STUDY_STYLE_RECOMMENDATIONS: Record<StudyStyle, string> = {
  visual: "Start with Mind Map, then Notes, Flashcards, Quiz, and Revision.",
  reading: "Start with Notes, then Formula Sheet, Doubt Solver, Quiz, and Revision.",
  practice: "Start with Quiz, then Autopsy, Notes on weak topics, Teach Me, and Revision.",
  mixed: "Start with the Study Plan, then Notes, Quiz, Revision, and Track."
};

export const FEATURE_GUIDES: StudyWorkflowFeatureGuide[] = [
  ...WORKFLOW_NAV_ITEMS.map((item) => ({
    name: item.label,
    href: item.href,
    icon: item.icon,
    description: item.helpDescription,
    whenToUse: item.whenToUse
  })),
  {
    name: "Voice Doubts",
    href: "/dashboard/study?tool=doubts",
    icon: IconMicrophone,
    description: "Use this when you want to ask doubts out loud instead of typing. It shares the same chat history as the regular doubt solver.",
    whenToUse: "Best for low-friction study moments like walking, commuting, or when you are too tired to type."
  },
  {
    name: "Exam Autopsy",
    href: "/dashboard/test?tool=quiz",
    icon: IconMicroscope,
    description: "Use this after every failed or mediocre quiz. It explains why answers went wrong so your next study step is obvious.",
    whenToUse: "Open it right after any quiz below your confidence threshold, especially under 80%."
  },
  {
    name: "Daily Brief",
    href: "/dashboard",
    icon: IconSun,
    description: "Read this every morning before you start. It pulls together revision due, upcoming exams, and what deserves attention today.",
    whenToUse: "Use it as the first 30-second check-in of every study day."
  },
  {
    name: "Simplifier Slider",
    href: "/dashboard/study?tool=notes",
    icon: IconSparkles,
    description: "Use this inside any note when a concept feels too dense. It rewrites the selected text from PhD-level down to child-friendly language.",
    whenToUse: "Use it the moment a note section feels too hard instead of abandoning the topic."
  },
  {
    name: "Streak & Achievements",
    href: "/dashboard/profile",
    icon: IconSparkles,
    description: "Track your consistency, level, XP, and milestones in one place. It turns progress into visible accountability.",
    whenToUse: "Review it weekly to see whether your habits match the exam pressure you are under."
  },
  {
    name: "Offline Mode",
    href: "/dashboard",
    icon: IconWifiOff,
    description: "Install StudyOS as an app so notes, flashcards, and plans stay available with poor connectivity. Cached content is clearly marked so it never feels falsely fresh.",
    whenToUse: "Use it when you travel, have unstable internet, or want your study material available anywhere."
  }
];

export const HELP_GOAL_ACTIONS: HelpGoalAction[] = [
  {
    key: "exam_3_days",
    title: "I have an exam in 3 days",
    steps: [
      "View Exam Autopsy on your lowest quiz score for that subject.",
      "Generate notes on the weak topics it identifies.",
      "Clear your revision queue for those same topics."
    ]
  },
  {
    key: "dont_know_where_to_start",
    title: "I don't know where to start",
    steps: ["Generate your study plan.", "Generate notes for today's first topic.", "Take a quiz on it right away."]
  },
  {
    key: "study_right_now",
    title: "I want to study right now",
    steps: ["Open Focus Room.", "When the session ends, take a quiz on what you just studied."]
  },
  {
    key: "revise_everything",
    title: "I want to revise everything",
    steps: ["Open the Revision Queue.", "Work through all due items before starting new content."]
  }
];

export const TOUR_PAGE_KEYS: Record<TourPageName, string> = {
  dashboard: "dashboard",
  plan: "plan",
  study: "study",
  test: "test",
  revise: "revise",
  track: "track",
  noteViewer: "note-viewer",
};

export const CONTEXTUAL_HINT_IDS: ContextualHintId[] = [
  "notes_no_quiz",
  "quiz_no_autopsy",
  "revision_overdue",
  "exam_approaching_no_plan",
  "formula_sheet_empty",
  "teach_me_after_quiz_fail",
  "scanner_exists",
  "focus_room_reminder",
  "knowledge_graph_ready",
  "group_room_available"
];

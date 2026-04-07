export const DEFAULT_APP_SETTINGS_VALUES = {
  feedbackEnabled: true,
  feedbackPromptTitle: "Tell us what should feel better.",
  feedbackPromptDescription:
    "Share bugs, missing details, feature ideas, or rough edges from your experience. Every report goes straight to the StudyOS team with helpful context.",
  maintenanceBanner: {
    enabled: false,
    message: "Scheduled maintenance is in progress. Some features may respond more slowly than usual."
  },
  featureToggles: {
    adminDashboard: true,
    feedback: true,
    errorMonitoring: true
  },
  errorAlerts: {
    severityThreshold: "error",
    cooldownMinutes: 120
  },
  landing: {
    heroEyebrow: "A calmer study workspace for serious students",
    heroTitle: "Calm study flow for every subject.",
    heroDescription:
      "StudyOS brings notes, doubts, quizzes, planners, flashcards, mind maps, and progress into one quiet workspace so students can think clearly and move consistently.",
    heroPanelEyebrow: "Today in StudyOS",
    heroPanelTitle: "A calmer control panel",
    platformEyebrow: "Platform",
    platformTitle: "Everything your study loop needs",
    platformDescription:
      "Built for students who want less clutter, better structure, and tools that feel integrated instead of bolted on.",
    trustEyebrow: "Trust",
    trustTitle: "Progress stays grounded in real work.",
    trustDescription:
      "StudyOS is designed around actual student activity, not decorative dashboards. Notes, quizzes, planners, and revision all feed back into a single calm system.",
    highlights: [
      {
        title: "Quiet surfaces",
        description: "Glass panels, restrained motion, and focused reading spaces."
      },
      {
        title: "Real progress",
        description: "Streaks, XP, quiz scores, and study time pulled from real activity."
      },
      {
        title: "One workspace",
        description: "Switch from notes to quizzes to planner without losing context."
      }
    ],
    features: [
      {
        title: "Handwritten Notes",
        iconKey: "book",
        description: "Topper-style note generation with premium paper rendering and PDF export."
      },
      {
        title: "Doubt Solver",
        iconKey: "help",
        description: "Chat-style tutor that explains step by step using your selected subject."
      },
      {
        title: "Study Planner",
        iconKey: "calendar",
        description: "Date-aware schedules that prioritize exams and balance study load."
      },
      {
        title: "Quiz Generator",
        iconKey: "brain",
        description: "MCQ quizzes with explanations, scoring, and performance tracking."
      },
      {
        title: "Flashcards",
        iconKey: "layers",
        description: "Topic decks with flip animations and difficulty marking for revision."
      },
      {
        title: "Video Finder",
        iconKey: "play",
        description: "Educational YouTube discovery with quick filtering by duration."
      },
      {
        title: "Mind Maps",
        iconKey: "topology",
        description: "Concept maps you can drag, zoom, and export as PNG."
      },
      {
        title: "Progress",
        iconKey: "chart",
        description: "Real streak, XP, level, and achievement analytics from your own activity."
      }
    ],
    testimonials: [
      {
        name: "Aarav",
        text: "The notes feel clean enough to study from immediately, not like rough draft text dropped into a page."
      },
      {
        name: "Isha",
        text: "Planner, doubts, and quiz flow together without forcing me into five different tools."
      },
      {
        name: "Rahul",
        text: "The calmer design actually makes me open it more often and stay longer."
      }
    ]
  }
} as const;

export type DefaultAppSettingsValues = typeof DEFAULT_APP_SETTINGS_VALUES;

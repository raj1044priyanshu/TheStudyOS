import type { FaqItem } from "@/lib/structured-data";

export interface FeaturePage {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  seoDescription: string;
  eyebrow: string;
  iconKey: "book" | "help" | "calendar" | "brain" | "layers" | "play" | "topology" | "chart";
  highlights: string[];
  benefits: string[];
  workflow: string[];
  faqs: FaqItem[];
}

export const FEATURE_PAGES: FeaturePage[] = [
  {
    slug: "handwritten-notes",
    title: "Handwritten Notes",
    shortTitle: "Notes",
    description: "Generate polished study notes with structured headings, classroom-safe explanations, and export-friendly reading.",
    seoDescription: "Create exam-ready handwritten-style study notes with structured explanations and export-friendly layouts.",
    eyebrow: "Feature",
    iconKey: "book",
    highlights: ["Structured note layouts", "Classroom-safe explanations", "Export-friendly reading views"],
    benefits: [
      "Turn a study topic into a readable note set with a consistent visual format.",
      "Keep explanations exam-safe and classroom aligned instead of generic AI text.",
      "Move from first draft to revision material without rewriting everything manually."
    ],
    workflow: [
      "Choose a subject, grade, and topic.",
      "Generate a note with the level of detail you want.",
      "Review, save, and use it again inside revision and formula workflows."
    ],
    faqs: [
      {
        question: "What makes the notes different from plain AI text?",
        answer: "StudyOS formats notes into sectioned, revision-friendly study material with clearer structure and better scanability."
      },
      {
        question: "Can I use notes for revision later?",
        answer: "Yes. Generated notes feed into other study flows like revision scheduling and formula extraction."
      }
    ]
  },
  {
    slug: "doubt-solver",
    title: "Doubt Solver",
    shortTitle: "Doubts",
    description: "Work through confusing topics step by step instead of jumping between scattered explanations.",
    seoDescription: "Use StudyOS doubt solving to get focused, step-by-step explanations for confusing study topics in one workspace.",
    eyebrow: "Feature",
    iconKey: "help",
    highlights: ["Step-by-step explanations", "Subject-aware prompts", "Fast clarification flow"],
    benefits: [
      "Get short, direct explanations without leaving your study session.",
      "Keep questions connected to your current subject and learning context.",
      "Reduce friction when you get stuck on one step or term."
    ],
    workflow: [
      "Open the doubt-solving workspace.",
      "Ask a focused question about the exact concept that is blocking you.",
      "Use the explanation to continue your notes, quizzes, or revision plan."
    ],
    faqs: [
      {
        question: "Is the doubt solver meant for long tutoring sessions?",
        answer: "It is better for focused clarifications that unblock the next study step quickly."
      },
      {
        question: "Can I use it while studying another tool in StudyOS?",
        answer: "Yes. It fits into the same workspace so you can move back into notes or quizzes without context switching."
      }
    ]
  },
  {
    slug: "study-planner",
    title: "Study Planner",
    shortTitle: "Planner",
    description: "Create day-by-day study schedules that prioritize exams, chapters, and realistic hours per day.",
    seoDescription: "Build day-by-day study plans around subjects, chapters, and exam dates with StudyOS planning tools.",
    eyebrow: "Feature",
    iconKey: "calendar",
    highlights: ["Exam-aware schedules", "Chapter-by-chapter planning", "Built-in progress tracking"],
    benefits: [
      "Translate exam pressure into a realistic, daily study plan.",
      "Balance stronger and weaker subjects without overloading one day.",
      "Keep plan progress tied to actual tasks and checkpoints."
    ],
    workflow: [
      "Select subjects or confirmed exams.",
      "Set study hours and focus topics.",
      "Generate a plan and work through tasks with linked quiz checkpoints."
    ],
    faqs: [
      {
        question: "Can I plan around exam dates instead of generic subjects?",
        answer: "Yes. StudyOS can generate plans from saved exams and chapter lists, not just broad subjects."
      },
      {
        question: "Does planner progress connect to the rest of the app?",
        answer: "Yes. Planner actions flow into streaks, progress tracking, and linked quizzes."
      }
    ]
  },
  {
    slug: "quiz-generator",
    title: "Quiz Generator",
    shortTitle: "Quizzes",
    description: "Generate topic quizzes quickly, test active recall, and review the result in the same study loop.",
    seoDescription: "Generate study quizzes by topic, difficulty, and question count to practice recall and track performance.",
    eyebrow: "Feature",
    iconKey: "brain",
    highlights: ["Topic-based quizzes", "Difficulty control", "Immediate results and follow-up actions"],
    benefits: [
      "Turn just-studied material into a quick retrieval test.",
      "Adjust difficulty and question count to match the session.",
      "Use quiz outcomes to guide revision and planner follow-up."
    ],
    workflow: [
      "Pick a topic, subject, difficulty, and question count.",
      "Generate a quiz and complete it inside the dashboard.",
      "Review results and queue revision for weaker recall areas."
    ],
    faqs: [
      {
        question: "Can quizzes connect back to my planner?",
        answer: "Yes. Planner-linked quizzes can be used as chapter checkpoints for scheduled work."
      },
      {
        question: "Are quiz results saved?",
        answer: "Yes. Recent quiz attempts, scores, and follow-up actions stay available in the app."
      }
    ]
  },
  {
    slug: "flashcards",
    title: "Flashcards",
    shortTitle: "Flashcards",
    description: "Use quick review decks for definitions, short facts, and repeated active recall.",
    seoDescription: "Review flashcards for quick fact recall, repeated revision, and compact study sessions in StudyOS.",
    eyebrow: "Feature",
    iconKey: "layers",
    highlights: ["Compact revision decks", "Flip-based review", "Difficulty-based practice"],
    benefits: [
      "Turn small facts and definitions into repeatable review loops.",
      "Keep revision light enough for short breaks or end-of-day study.",
      "Build consistency for memory-heavy topics."
    ],
    workflow: [
      "Open a deck or generate new cards.",
      "Review cards in short bursts.",
      "Mark difficulty and return later for spaced revision."
    ],
    faqs: [
      {
        question: "What kinds of topics work best in flashcards?",
        answer: "Definitions, formulas, dates, vocabulary, and short concept checks tend to work best."
      },
      {
        question: "Do flashcards replace long-form notes?",
        answer: "No. They work best as a revision layer after notes or topic study."
      }
    ]
  },
  {
    slug: "video-finder",
    title: "Video Finder",
    shortTitle: "Videos",
    description: "Discover relevant educational videos without leaving your study workspace or losing topic context.",
    seoDescription: "Find educational videos by subject and topic inside StudyOS without breaking your study flow.",
    eyebrow: "Feature",
    iconKey: "play",
    highlights: ["Topic-based discovery", "Quick filtering", "Study-flow friendly results"],
    benefits: [
      "Use video as a support layer when one explanation style is not enough.",
      "Stay anchored to your current topic instead of wandering across tabs.",
      "Find learning material faster when you need another angle."
    ],
    workflow: [
      "Search for a subject and topic.",
      "Filter the results to the kind of video you want.",
      "Use it as a supplement, then return to notes, quizzes, or revision."
    ],
    faqs: [
      {
        question: "Is the video finder meant to replace studying from notes?",
        answer: "No. It is best used when you want a second explanation style or visual reinforcement."
      },
      {
        question: "Can I use videos as part of a bigger study workflow?",
        answer: "Yes. The tool sits inside the same workspace so you can move directly into quizzes or notes afterward."
      }
    ]
  },
  {
    slug: "mind-maps",
    title: "Mind Maps",
    shortTitle: "Mind Maps",
    description: "Map out connected concepts visually so complex topics feel easier to review and explain.",
    seoDescription: "Create visual mind maps for connected concepts, chapter overviews, and revision planning in StudyOS.",
    eyebrow: "Feature",
    iconKey: "topology",
    highlights: ["Concept relationships", "Zoomable topic views", "Visual revision support"],
    benefits: [
      "See how ideas connect across one topic or chapter.",
      "Turn dense material into a visual study reference.",
      "Support revision with an overview that is faster to scan than full notes."
    ],
    workflow: [
      "Generate a concept map for the topic.",
      "Review nodes and relationships visually.",
      "Use the map for revision, teaching, or quick pre-test scanning."
    ],
    faqs: [
      {
        question: "When is a mind map more useful than regular notes?",
        answer: "Mind maps are especially useful when you need to review relationships between concepts instead of paragraph details."
      },
      {
        question: "Can I use mind maps for revision?",
        answer: "Yes. They work well as pre-test overview material and quick chapter refreshers."
      }
    ]
  },
  {
    slug: "progress-tracking",
    title: "Progress",
    shortTitle: "Progress",
    description: "Track streaks, study time, achievements, and activity-based progress instead of guessing how much you studied.",
    seoDescription: "Track real study progress with streaks, time studied, milestones, and activity-based learning signals in StudyOS.",
    eyebrow: "Feature",
    iconKey: "chart",
    highlights: ["Activity-based metrics", "Streak and milestone visibility", "Motivation without clutter"],
    benefits: [
      "Measure progress from actual study work instead of rough estimates.",
      "See momentum through streaks, time, and milestones in one place.",
      "Keep motivation anchored to completed work."
    ],
    workflow: [
      "Use notes, quizzes, planner tasks, and focus sessions as normal.",
      "Let StudyOS log meaningful progress signals automatically.",
      "Review streaks, achievements, and study trends over time."
    ],
    faqs: [
      {
        question: "Is progress based on real actions or manual logging?",
        answer: "It is based on actual work completed in the product, such as notes, quizzes, and study sessions."
      },
      {
        question: "Why does progress tracking matter for SEO-facing feature pages?",
        answer: "It helps explain how StudyOS goes beyond isolated tools and acts like one connected study system."
      }
    ]
  }
];

export const FEATURE_SLUG_BY_TITLE = Object.fromEntries(FEATURE_PAGES.map((feature) => [feature.title, feature.slug])) as Record<string, string>;

export function getFeatureBySlug(slug: string) {
  return FEATURE_PAGES.find((feature) => feature.slug === slug) ?? null;
}

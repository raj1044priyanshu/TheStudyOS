export const siteConfig = {
  name: "StudyOS",
  shortName: "StudyOS",
  title: "StudyOS — AI Notes, Quizzes, Planner & Revision for Students",
  description:
    "Generate study notes, take topic quizzes, build exam-ready planners, and revise with flashcards and mind maps — all in one focused workspace built for students.",
  keywords: [
    "AI study notes generator",
    "online quiz generator for students",
    "study planner for exams",
    "flashcard revision app",
    "mind map maker for students",
    "active recall study tool",
    "spaced repetition app",
    "CBSE study planner",
    "ICSE revision notes",
    "NEET study material",
    "JEE preparation planner",
    "student productivity app",
    "exam preparation tool",
    "doubt solver for students",
    "study streak tracker",
    "progress tracking for students",
    "free study app for school",
    "study room collaboration tool",
    "formula sheet generator",
    "focus timer for studying",
    "study workflow platform",
    "AI-powered revision tool"
  ],
  category: "education",
  locale: "en_US"
} as const;

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    return trimTrailingSlash(appUrl);
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return trimTrailingSlash(`https://${vercelUrl}`);
  }

  return "http://localhost:3000";
}

export function buildAbsoluteUrl(pathname = "/") {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPathname, getSiteUrl()).toString();
}

export function isPreviewDeployment() {
  return process.env.VERCEL_ENV === "preview";
}

export function shouldLoadGoogleAnalytics() {
  return process.env.NODE_ENV === "production" && !isPreviewDeployment() && Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim());
}

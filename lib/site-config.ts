export const siteConfig = {
  name: "StudyOS",
  shortName: "StudyOS",
  title: "StudyOS | Calm study workspace for focused students",
  description:
    "StudyOS brings notes, quizzes, planners, flashcards, mind maps, revision, and progress tracking into one focused study workspace for students.",
  keywords: [
    "study platform",
    "student productivity app",
    "study planner",
    "revision app",
    "quiz generator",
    "flashcards",
    "study notes",
    "mind maps"
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

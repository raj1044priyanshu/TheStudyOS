import { driver, type DriveStep } from "driver.js";
import type { TourPageName } from "@/types";

export const TOUR_COMPLETED_KEY = "studyos_tour_completed";
export const TOUR_PAGE_PREFIX = "studyos_tour_";
export const TOUR_FORCE_KEY = "studyos_tour_force";
export const TOUR_REQUESTED_KEY = "studyos_tour_requested";
export const TOUR_SCOPE_KEY = "studyos_tour_scope";
export const DAILY_BRIEF_STORAGE_KEY = "studyos_brief_date";

export function createTour(steps: DriveStep[], onComplete?: () => void) {
  const driverObj = driver({
    showProgress: true,
    animate: true,
    overlayColor: "rgba(15, 15, 35, 0.75)",
    stagePadding: 8,
    stageRadius: 12,
    popoverClass: "studyos-tour-popover",
    progressText: "{{current}} of {{total}}",
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    onDestroyStarted: () => {
      onComplete?.();
      driverObj.destroy();
    },
    steps
  });

  return driverObj;
}

export function getPageTourKey(page: TourPageName) {
  return `${TOUR_PAGE_PREFIX}${page}`;
}

export function markPageTourComplete(page: TourPageName) {
  window.localStorage.setItem(getPageTourKey(page), "true");
}

export function clearPageTour(page: TourPageName) {
  window.localStorage.removeItem(getPageTourKey(page));
}

export function hasCompletedPageTour(page: TourPageName) {
  return window.localStorage.getItem(getPageTourKey(page)) === "true";
}

export function markFullTourComplete() {
  window.localStorage.setItem(TOUR_COMPLETED_KEY, "true");
}

export function hasCompletedFullTour() {
  return window.localStorage.getItem(TOUR_COMPLETED_KEY) === "true";
}

export function clearAllTourStorage() {
  window.localStorage.removeItem(TOUR_COMPLETED_KEY);
  window.localStorage.removeItem(TOUR_FORCE_KEY);
  window.localStorage.removeItem(TOUR_SCOPE_KEY);
  window.sessionStorage.removeItem(TOUR_REQUESTED_KEY);
  const keys = Object.keys(window.localStorage);
  keys.forEach((key) => {
    if (key.startsWith(TOUR_PAGE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  });
}

export function queueForcedTour(page: TourPageName, scope: "page" | "full" = "page") {
  window.localStorage.setItem(TOUR_FORCE_KEY, page);
  window.localStorage.setItem(TOUR_SCOPE_KEY, scope);
  window.sessionStorage.setItem(TOUR_REQUESTED_KEY, page);
}

export function readForcedTour() {
  return window.localStorage.getItem(TOUR_FORCE_KEY) as TourPageName | null;
}

export function readTourScope() {
  return (window.localStorage.getItem(TOUR_SCOPE_KEY) as "page" | "full" | null) ?? "page";
}

export function clearForcedTour() {
  window.localStorage.removeItem(TOUR_FORCE_KEY);
  window.localStorage.removeItem(TOUR_SCOPE_KEY);
  window.sessionStorage.removeItem(TOUR_REQUESTED_KEY);
}

export function getTourPageFromPathname(pathname: string): TourPageName | null {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname === "/dashboard/plan") return "plan";
  if (pathname === "/dashboard/study") return "study";
  if (pathname === "/dashboard/test") return "test";
  if (pathname === "/dashboard/revise") return "revise";
  if (pathname === "/dashboard/track") return "track";
  if (pathname.startsWith("/dashboard/notes/")) return "noteViewer";
  return null;
}

export async function isElementInViewport(selector: string) {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) {
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        observer.disconnect();
        resolve(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.2 }
    );

    observer.observe(target);
    window.setTimeout(() => {
      observer.disconnect();
      const rect = target.getBoundingClientRect();
      resolve(rect.top < window.innerHeight && rect.bottom > 0);
    }, 120);
  });
}

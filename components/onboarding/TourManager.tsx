"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DriveStep } from "driver.js";
import type { TourPageName } from "@/types";
import {
  clearForcedTour,
  createTour,
  getTourPageFromPathname,
  isElementInViewport,
  markFullTourComplete,
  markPageTourComplete,
  queueForcedTour,
  readForcedTour,
  readTourScope
} from "@/lib/tour";

type TourDefinition = {
  page: TourPageName;
  steps: DriveStep[];
};

const FULL_TOUR_SEQUENCE: TourPageName[] = ["dashboard", "plan", "study", "test", "revise", "track"];

const PAGE_HREFS: Record<TourPageName, string> = {
  dashboard: "/dashboard",
  plan: "/dashboard/plan",
  study: "/dashboard/study",
  test: "/dashboard/test",
  revise: "/dashboard/revise",
  track: "/dashboard/track",
  noteViewer: "/dashboard/study?tool=notes"
};

function centeredStep(title: string, description: string): DriveStep {
  return {
    popover: {
      title,
      description,
      side: "bottom",
      align: "center"
    }
  };
}

const TOUR_DEFINITIONS: TourDefinition[] = [
  {
    page: "dashboard",
    steps: [
      {
        element: "#sidebar",
        popover: {
          title: "Your Navigation Hub",
          description: "The app now moves through five phase hubs: Plan, Study, Test, Revise, and Track.",
          side: "right"
        }
      },
      {
        element: "#phase-card-plan",
        popover: {
          title: "Plan First",
          description: "Start here to organise exams, daily study time, and what should happen next.",
          side: "bottom"
        }
      },
      {
        element: "#phase-card-study",
        popover: {
          title: "Study Hub",
          description: "Use this hub for notes, doubts, focus sessions, videos, and scanning physical material.",
          side: "bottom"
        }
      },
      {
        element: "#phase-card-test",
        popover: {
          title: "Test Hub",
          description: "Quiz, flashcards, Teach Me, evaluator, and past papers now live together here.",
          side: "bottom"
        }
      },
      {
        element: "#phase-card-revise",
        popover: {
          title: "Revise Hub",
          description: "Come back here every day to keep knowledge active instead of relearning it later.",
          side: "bottom"
        }
      },
      {
        element: "#phase-card-track",
        popover: {
          title: "Track Hub",
          description: "Review weekly patterns, weak topics, and long-term progress from one place.",
          side: "bottom"
        }
      },
      centeredStep("Ready to move through the hubs?", "Next, we will step through each phase in the order you will actually use them.")
    ]
  },
  {
    page: "plan",
    steps: [
      {
        element: "#hub-tab-plan-planner",
        popover: {
          title: "Planner Tab",
          description: "This is the starting point for your daily schedule and subject balance.",
          side: "bottom"
        }
      },
      {
        element: "#planner-form",
        popover: {
          title: "Build the Schedule",
          description: "Generate or adjust the plan here whenever your availability or exam timeline changes.",
          side: "right"
        }
      },
      {
        element: "#hub-tab-plan-exams",
        popover: {
          title: "Exams Tab",
          description: "Switch here to manage countdowns, readiness, and urgent recovery plans.",
          side: "bottom"
        }
      }
    ]
  },
  {
    page: "study",
    steps: [
      {
        element: "#hub-tab-study-notes",
        popover: {
          title: "Notes Tab",
          description: "Most study sessions start here: build the note, then move through the rest of the system.",
          side: "bottom"
        }
      },
      {
        element: "#generate-note-btn",
        popover: {
          title: "Generate a Note",
          description: "Choose the subject and topic here to create the first layer of study material.",
          side: "bottom"
        }
      },
      {
        element: "#hub-tab-study-focus-room",
        popover: {
          title: "Focus Room Tab",
          description: "Open a timed focus block from this hub whenever you are ready to study without distraction.",
          side: "bottom"
        }
      }
    ]
  },
  {
    page: "test",
    steps: [
      {
        element: "#hub-tab-test-quiz",
        popover: {
          title: "Quiz Tab",
          description: "Right after studying, test recall here so the topic moves from recognition into memory.",
          side: "bottom"
        }
      },
      {
        element: "#quiz-topic-input",
        popover: {
          title: "Use the same topic you just studied",
          description: "The fastest feedback loop is note first, then quiz on the same topic immediately.",
          side: "bottom"
        }
      },
      {
        element: "#hub-tab-test-flashcards",
        popover: {
          title: "Flashcards Tab",
          description: "Use this when the topic needs short repeated review rather than a full quiz session.",
          side: "bottom"
        }
      }
    ]
  },
  {
    page: "revise",
    steps: [
      {
        element: "#hub-tab-revise-revision-queue",
        popover: {
          title: "Revision Queue",
          description: "This is the daily maintenance system for everything you already studied.",
          side: "bottom"
        }
      },
      {
        element: "#revision-due-list",
        popover: {
          title: "Due Today",
          description: "Clear this list before opening brand-new content whenever you can.",
          side: "right"
        }
      },
      {
        element: "#hub-tab-revise-knowledge-graph",
        popover: {
          title: "Knowledge Graph",
          description: "This tab shows how studied concepts connect, so weak spots become easier to spot.",
          side: "bottom"
        }
      }
    ]
  },
  {
    page: "track",
    steps: [
      {
        element: "#study-heatmap",
        popover: {
          title: "Consistency View",
          description: "This section shows whether your recent study pattern is actually steady or just intense in bursts.",
          side: "top"
        }
      },
      {
        element: "#weak-topics-section",
        popover: {
          title: "Weak Topics",
          description: "Use this as a weekly review surface to decide what needs another study pass.",
          side: "top"
        }
      },
      centeredStep("You are set.", "Start from Dashboard each day, move into Plan, then Study, Test, Revise, and Track.")
    ]
  },
  {
    page: "noteViewer",
    steps: [
      {
        element: "#note-paper",
        popover: {
          title: "Note Viewer",
          description: "This full page is for deep reading when a topic needs your full attention.",
          side: "right"
        }
      },
      {
        element: "#note-toolbar",
        popover: {
          title: "Note Tools",
          description: "Use the toolbar for export, zoom, and navigation while reading.",
          side: "bottom"
        }
      },
      {
        element: "#simplify-instruction",
        popover: {
          title: "Simplify Selected Text",
          description: "When a section feels too dense, simplify just that part instead of leaving the note.",
          side: "top"
        }
      }
    ]
  }
];

async function getEligibleSteps(steps: DriveStep[]) {
  const isMobile = window.innerWidth < 768;
  const eligible: DriveStep[] = [];

  for (const step of steps) {
    const element = typeof step.element === "string" ? step.element : null;
    if (!element) {
      eligible.push(step);
      continue;
    }

    const target = document.querySelector(element);
    if (!target) {
      continue;
    }

    if (!isMobile || (await isElementInViewport(element))) {
      eligible.push(step);
    }
  }

  return eligible;
}

export function TourManager() {
  const pathname = usePathname();
  const router = useRouter();
  const runningRef = useRef(false);
  const currentPage = useMemo(() => getTourPageFromPathname(pathname), [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function maybeRun(forcePage?: TourPageName) {
      if (runningRef.current) {
        return false;
      }

      const page = forcePage ?? currentPage;
      if (!page) {
        return false;
      }

      const definition = TOUR_DEFINITIONS.find((item) => item.page === page);
      if (!definition) {
        return false;
      }

      if (page === "dashboard" && document.getElementById("daily-brief-card")) {
        return false;
      }

      if (!forcePage) {
        return false;
      }

      const eligibleSteps = await getEligibleSteps(definition.steps);
      if (!eligibleSteps.length || cancelled) {
        return false;
      }

      const scope = readTourScope();
      if (readForcedTour() === page) {
        clearForcedTour();
      }

      runningRef.current = true;
      createTour(eligibleSteps, () => {
        runningRef.current = false;
        markPageTourComplete(page);

        if (scope === "full") {
          const index = FULL_TOUR_SEQUENCE.indexOf(page);
          if (index >= 0 && index < FULL_TOUR_SEQUENCE.length - 1) {
            const nextPage = FULL_TOUR_SEQUENCE[index + 1];
            queueForcedTour(nextPage, "full");
            router.push(PAGE_HREFS[nextPage]);
            return;
          }

          markFullTourComplete();
          router.push("/dashboard");
        }
      }).drive();

      return true;
    }

    const scheduleRun = (forcePage?: TourPageName, delay = 480) => {
      window.setTimeout(() => {
        void maybeRun(forcePage);
      }, delay);
    };

    const forced = readForcedTour();
    const requested = typeof window !== "undefined" ? window.sessionStorage.getItem("studyos_tour_requested") : null;
    if (forced && requested !== forced) {
      clearForcedTour();
    }

    if (forced && requested === forced && forced === currentPage) {
      scheduleRun(forced, 360);
    }

    const briefDismissHandler = () => {
      const pendingForced = readForcedTour();
      if (pendingForced && pendingForced === currentPage) {
        scheduleRun(pendingForced, 140);
      }
    };

    window.addEventListener("studyos:brief-dismissed", briefDismissHandler);

    return () => {
      cancelled = true;
      window.removeEventListener("studyos:brief-dismissed", briefDismissHandler);
    };
  }, [currentPage, pathname, router]);

  useEffect(() => {
    const restartHandler = () => {
      queueForcedTour("dashboard", "full");
      router.push("/dashboard");
    };

    const pageHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ page?: TourPageName }>).detail;
      if (!detail?.page) {
        return;
      }

      queueForcedTour(detail.page, "page");

      if (detail.page === currentPage) {
        window.setTimeout(() => {
          const pending = readForcedTour();
          if (pending === currentPage) {
            window.dispatchEvent(new CustomEvent("studyos:brief-dismissed"));
          }
        }, 50);
        return;
      }

      router.push(detail.page === "noteViewer" && pathname.startsWith("/dashboard/notes/") ? pathname : PAGE_HREFS[detail.page]);
    };

    window.addEventListener("studyos:tour-restart", restartHandler);
    window.addEventListener("studyos:tour-page", pageHandler as EventListener);

    return () => {
      window.removeEventListener("studyos:tour-restart", restartHandler);
      window.removeEventListener("studyos:tour-page", pageHandler as EventListener);
    };
  }, [currentPage, pathname, router]);

  return null;
}

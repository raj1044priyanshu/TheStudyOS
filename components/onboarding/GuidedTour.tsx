"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getNavItemForRoute } from "@/lib/navigation";

interface Props {
  enabled: boolean;
}

const completionEvents = [
  "tour:note-generated",
  "tour:quiz-answered",
  "tour:quiz-submitted",
  "tour:quiz-returned",
  "tour:planner-generated",
  "tour:planner-task-completed",
  "tour:doubt-sent",
  "tour:flashcards-generated",
  "tour:flashcard-flipped",
  "tour:videos-searched",
  "tour:mindmap-generated",
  "tour:profile-saved",
  "tour:notifications-opened"
] as const;

type TourEventName = (typeof completionEvents)[number];

interface TourStep {
  id: string;
  selector: string;
  spotlightSelector?: string;
  title: string;
  description: string;
  example?: string;
  route?: string;
  missingTargetFallback?: {
    selector: string;
    title: string;
    description: string;
    example?: string;
  };
  completionRoute?: string;
  completionSelectorVisible?: string;
  completionSelectorMissing?: string;
  completionInputContains?: {
    selector: string;
    valueIncludes: string;
  };
  completionEvent?: TourEventName;
  requiresMobileMoreMenu?: boolean;
  mobilePanelPlacement?: "auto" | "top" | "bottom";
  desktopPanelPlacement?: "auto" | "left" | "right" | "top" | "bottom";
}

interface TourFallbackTarget {
  selector: string;
  title: string;
  description: string;
  example?: string;
}

const MOBILE_MORE_BUTTON_SELECTOR = '[data-tour-id="nav-more"]';
const MOBILE_MORE_SHEET_SELECTOR = '[data-tour-id="mobile-more-sheet"]';

const steps: TourStep[] = [
  {
    id: "dashboard-search",
    selector: '[data-tour-id="dashboard-search"]',
    title: "Smart Search",
    description: "Click search to find notes, quizzes, and planner items instantly.",
    route: "/dashboard",
    example: "Example query: photosynthesis notes",
    requiresMobileMoreMenu: true
  },
  {
    id: "nav-notes",
    selector: '[data-tour-id="nav-notes"]',
    title: "Open Notes",
    description: "Click Notes in the navigation.",
    completionRoute: "/notes"
  },
  {
    id: "notes-generate",
    selector: '[data-tour-id="notes-generate"]',
    title: "Create Notes",
    description: "Click Generate Note to open the handwritten note builder.",
    route: "/notes",
    completionSelectorVisible: '[data-tour-id="notes-builder-close"]'
  },
  {
    id: "notes-close-builder",
    selector: '[data-tour-id="notes-builder-close"]',
    spotlightSelector: '[data-tour-id="notes-builder-dialog"]',
    title: "Close Builder",
    description: "Click Close or Cancel to return to your notes list.",
    route: "/notes",
    desktopPanelPlacement: "left",
    completionSelectorMissing: '[data-tour-id="notes-builder-close"]'
  },
  {
    id: "nav-quiz",
    selector: '[data-tour-id="nav-quiz"]',
    title: "Open Quiz",
    description: "Click Quiz in the navigation.",
    completionRoute: "/quiz"
  },
  {
    id: "quiz-example",
    selector: '[data-tour-id="quiz-example-fill"]',
    spotlightSelector: '[data-tour-id="quiz-setup-card"]',
    title: "Use Quiz Example",
    description: "Click Use Example to auto-fill a ready-to-start quiz.",
    route: "/quiz",
    example: "Trigonometry basics, medium, 8 questions",
    completionInputContains: {
      selector: '[data-tour-id="quiz-topic-input"]',
      valueIncludes: "Trigonometry"
    }
  },
  {
    id: "quiz-start",
    selector: '[data-tour-id="quiz-start-button"]',
    spotlightSelector: '[data-tour-id="quiz-setup-card"]',
    title: "Start Quiz",
    description: "Click Start Quiz to generate and open the quiz.",
    route: "/quiz",
    completionRoute: "/quiz/"
  },
  {
    id: "quiz-answer",
    selector: '[data-tour-id="quiz-option-a"]',
    title: "Answer Question",
    description: "Click any option to answer this question.",
    route: "/quiz/",
    completionEvent: "tour:quiz-answered"
  },
  {
    id: "quiz-submit",
    selector: '[data-tour-id="quiz-submit-button"]',
    title: "Submit Quiz",
    description: "Click Submit Quiz to finish and record your score.",
    route: "/quiz/",
    completionEvent: "tour:quiz-submitted"
  },
  {
    id: "quiz-new",
    selector: '[data-tour-id="quiz-new-button"]',
    title: "Create Another Quiz",
    description: "Click New Quiz to return to quiz creation.",
    route: "/quiz/",
    missingTargetFallback: {
      selector: '[data-tour-id="quiz-submit-button"]',
      title: "Finish This Quiz First",
      description: "Submit the current quiz first. After the results screen appears, this step will point to New Quiz."
    },
    completionEvent: "tour:quiz-returned",
    completionRoute: "/quiz"
  },
  {
    id: "nav-planner",
    selector: '[data-tour-id="nav-planner"]',
    title: "Open Planner",
    description: "Click Planner in the navigation.",
    completionRoute: "/planner",
    requiresMobileMoreMenu: true
  },
  {
    id: "planner-example",
    selector: '[data-tour-id="planner-example-fill"]',
    title: "Use Planner Example",
    description: "Click Use Example to auto-fill a realistic exam plan.",
    route: "/planner",
    desktopPanelPlacement: "right",
    example: "Board Exam Sprint",
    completionInputContains: {
      selector: '[data-tour-id="planner-name-input"]',
      valueIncludes: "Board Exam Sprint"
    }
  },
  {
    id: "planner-generate",
    selector: '[data-tour-id="planner-generate-plan"]',
    title: "Generate Plan",
    description: "Click Generate Plan to build your day-wise tasks.",
    route: "/planner",
    completionEvent: "tour:planner-generated"
  },
  {
    id: "planner-task",
    selector: '[data-tour-id="planner-first-task-checkbox"]',
    title: "Complete a Task",
    description: "Click the first task checkbox to mark progress and protect your streak.",
    route: "/planner",
    missingTargetFallback: {
      selector: '[data-tour-id="planner-generate-plan"]',
      title: "Generate a Plan First",
      description: "Create a study plan first so daily task checkboxes appear here."
    },
    completionSelectorVisible: '[data-tour-id="planner-first-task-checkbox"]:checked'
  },
  {
    id: "nav-doubts",
    selector: '[data-tour-id="nav-doubts"]',
    title: "Open Doubts",
    description: "Click Doubts in the navigation.",
    completionRoute: "/doubts"
  },
  {
    id: "doubts-example",
    selector: '[data-tour-id="doubts-example-fill"]',
    title: "Use Doubt Example",
    description: "Click Use Example to load a sample tutor question.",
    route: "/doubts",
    example: "Explain chain rule with one solved example",
    completionInputContains: {
      selector: '[data-tour-id="doubts-input"]',
      valueIncludes: "chain rule"
    }
  },
  {
    id: "doubts-send",
    selector: '[data-tour-id="doubts-send"]',
    title: "Ask Tutor",
    description: "Click Send to get a clear step-by-step explanation.",
    route: "/doubts",
    completionEvent: "tour:doubt-sent"
  },
  {
    id: "nav-flashcards",
    selector: '[data-tour-id="nav-flashcards"]',
    title: "Open Flashcards",
    description: "Click Flashcards in the navigation.",
    completionRoute: "/flashcards",
    requiresMobileMoreMenu: true
  },
  {
    id: "flashcards-example",
    selector: '[data-tour-id="flashcards-example-fill"]',
    title: "Use Flashcard Example",
    description: "Click Use Example to auto-fill a revision topic.",
    route: "/flashcards",
    example: "Cell structure and organelles",
    completionInputContains: {
      selector: '[data-tour-id="flashcards-topic-input"]',
      valueIncludes: "Cell structure"
    }
  },
  {
    id: "flashcards-generate",
    selector: '[data-tour-id="flashcards-generate"]',
    title: "Generate Deck",
    description: "Click Generate Deck to create your flashcards.",
    route: "/flashcards",
    completionEvent: "tour:flashcards-generated"
  },
  {
    id: "flashcards-flip",
    selector: '[data-tour-id="flashcards-flip-card"]',
    title: "Flip Card",
    description: "Click the card to flip and reveal the answer.",
    route: "/flashcards",
    missingTargetFallback: {
      selector: '[data-tour-id="flashcards-generate"]',
      title: "Generate Cards First",
      description: "Create a deck first. Once the flashcard appears, this step will switch to the card."
    },
    completionEvent: "tour:flashcard-flipped"
  },
  {
    id: "nav-videos",
    selector: '[data-tour-id="nav-videos"]',
    title: "Open Videos",
    description: "Click Videos in the navigation.",
    completionRoute: "/videos",
    requiresMobileMoreMenu: true
  },
  {
    id: "videos-example",
    selector: '[data-tour-id="videos-example-fill"]',
    title: "Use Video Example",
    description: "Click Use Example to fill a topic search.",
    route: "/videos",
    example: "Laws of motion class 11",
    completionInputContains: {
      selector: '[data-tour-id="videos-query-input"]',
      valueIncludes: "Laws of motion"
    }
  },
  {
    id: "videos-search",
    selector: '[data-tour-id="videos-search-button"]',
    title: "Search Videos",
    description: "Click search to fetch educational video recommendations.",
    route: "/videos",
    completionEvent: "tour:videos-searched"
  },
  {
    id: "nav-mindmap",
    selector: '[data-tour-id="nav-mindmap"]',
    title: "Open Mind Map",
    description: "Click Mind Map in the navigation.",
    completionRoute: "/mindmap",
    requiresMobileMoreMenu: true
  },
  {
    id: "mindmap-example",
    selector: '[data-tour-id="mindmap-example-fill"]',
    title: "Use Mind Map Example",
    description: "Click Use Example to set a topic for map generation.",
    route: "/mindmap",
    example: "French Revolution",
    completionInputContains: {
      selector: '[data-tour-id="mindmap-topic-input"]',
      valueIncludes: "French Revolution"
    }
  },
  {
    id: "mindmap-generate",
    selector: '[data-tour-id="mindmap-generate"]',
    title: "Generate Mind Map",
    description: "Click Generate to create your visual concept map.",
    route: "/mindmap",
    completionEvent: "tour:mindmap-generated"
  },
  {
    id: "nav-progress",
    selector: '[data-tour-id="nav-progress"]',
    title: "Open Progress",
    description: "Click Progress in the navigation.",
    completionRoute: "/progress",
    requiresMobileMoreMenu: true
  },
  {
    id: "progress-card",
    selector: '[data-tour-id="progress-streak-card"]',
    title: "Track Performance",
    description: "Click the streak card to review your overall momentum.",
    route: "/progress"
  },
  {
    id: "nav-profile",
    selector: '[data-tour-id="nav-profile"]',
    title: "Open Profile",
    description: "Click Profile in the navigation.",
    completionRoute: "/profile",
    requiresMobileMoreMenu: true
  },
  {
    id: "profile-reminder",
    selector: '[data-tour-id="profile-name-input"]',
    title: "Profile Details",
    description: "Update your name or timezone here.",
    route: "/profile"
  },
  {
    id: "profile-save",
    selector: '[data-tour-id="profile-save-button"]',
    title: "Save Preferences",
    description: "Click Save Changes to persist your account settings.",
    route: "/profile",
    completionEvent: "tour:profile-saved"
  },
  {
    id: "notifications",
    selector: '[data-tour-id="topbar-notifications"]',
    title: "Notifications",
    description: "Click the bell to open in-app alerts.",
    completionEvent: "tour:notifications-opened",
    requiresMobileMoreMenu: true
  },
  {
    id: "nav-dashboard",
    selector: '[data-tour-id="nav-dashboard"]',
    title: "Finish Tour",
    description: "Click Dashboard to return home and finish onboarding.",
    completionRoute: "/dashboard"
  }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rectsOverlap(a: DOMRect | { top: number; left: number; width: number; height: number }, b: DOMRect, padding = 14) {
  const aTop = a.top - padding;
  const aLeft = a.left - padding;
  const aRight = a.left + a.width + padding;
  const aBottom = a.top + a.height + padding;
  const bTop = b.top - padding;
  const bLeft = b.left - padding;
  const bRight = b.left + b.width + padding;
  const bBottom = b.top + b.height + padding;

  return !(aRight <= bLeft || aLeft >= bRight || aBottom <= bTop || aTop >= bBottom);
}

function targetAvoidancePadding(targetRect: DOMRect) {
  const smallerEdge = Math.min(targetRect.width, targetRect.height);
  return smallerEdge <= 56 ? 28 : 18;
}

function desktopPlacementOrder(preferred: TourStep["desktopPanelPlacement"], targetRect?: DOMRect | null) {
  const defaults: Array<NonNullable<TourStep["desktopPanelPlacement"]>> = ["right", "left", "bottom", "top"];
  if (preferred && preferred !== "auto") {
    return [preferred, ...defaults.filter((item) => item !== preferred)];
  }

  if (!targetRect || typeof window === "undefined") {
    return defaults;
  }

  const horizontalHalf = window.innerWidth / 2;
  const verticalHalf = window.innerHeight / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const nearRight = targetCenterX >= horizontalHalf;
  const nearBottom = targetCenterY >= verticalHalf;

  if (nearRight && nearBottom) return ["left", "top", "right", "bottom"];
  if (!nearRight && nearBottom) return ["right", "top", "left", "bottom"];
  if (nearRight && !nearBottom) return ["left", "bottom", "right", "top"];
  return ["right", "bottom", "left", "top"];
}

function distanceBetweenRects(
  a: { top: number; left: number; width: number; height: number },
  b: DOMRect | { top: number; left: number; width: number; height: number }
) {
  const aCenterX = a.left + a.width / 2;
  const aCenterY = a.top + a.height / 2;
  const bCenterX = b.left + b.width / 2;
  const bCenterY = b.top + b.height / 2;
  return Math.hypot(aCenterX - bCenterX, aCenterY - bCenterY);
}

function routeMatches(pathname: string, expected: string) {
  if (!expected) return true;
  if (expected.endsWith("/")) {
    return pathname.startsWith(expected);
  }
  return pathname === expected || pathname.startsWith(`${expected}/`);
}

function getStepRevealLabel(step: TourStep) {
  return step.title.replace(/^Open\s+/i, "").trim();
}

function getNavTargetForRoute(route: string | undefined, options: { isMobile: boolean; mobileMoreSheetOpen: boolean }): TourFallbackTarget | null {
  const navItem = getNavItemForRoute(route);
  if (!navItem) {
    return null;
  }

  const actionVerb = options.isMobile ? "Tap" : "Click";

  if (options.isMobile && navItem.mobileSlot === "more" && !options.mobileMoreSheetOpen) {
    return {
      selector: MOBILE_MORE_BUTTON_SELECTOR,
      title: "Open More",
      description: `Tap More in the bottom navigation to reveal ${navItem.label}.`
    };
  }

  return {
    selector: `[data-tour-id="${navItem.tourId}"]`,
    title: `Open ${navItem.label}`,
    description: `${actionVerb} ${navItem.label} in the navigation to continue.`
  };
}

function readInputValue(selector: string) {
  if (typeof document === "undefined") return "";
  const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector);
  return element?.value ?? "";
}

function findMountedTarget(selector: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }

  const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
  for (const node of nodes) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
      continue;
    }

    const rect = node.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2) {
      return node;
    }
  }

  return null;
}

function findVisibleTarget(selector: string) {
  const mountedTarget = findMountedTarget(selector);
  if (!mountedTarget || typeof window === "undefined") {
    return null;
  }

  const rect = mountedTarget.getBoundingClientRect();
  const visible = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
  return visible ? mountedTarget : null;
}

function stepHasCompletionRequirement(step: TourStep) {
  return Boolean(
    step.completionRoute ||
      step.completionSelectorVisible ||
      step.completionSelectorMissing ||
      step.completionInputContains ||
      step.completionEvent
  );
}

export function GuidedTour({ enabled }: Props) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(enabled);
  const [stepIndex, setStepIndex] = useState(0);
  const [isClientReady, setIsClientReady] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [viewport, setViewport] = useState({ width: 1280, height: 720 });
  const [panelHeight, setPanelHeight] = useState(260);
  const [clickedCurrentStep, setClickedCurrentStep] = useState(false);
  const [eventCounts, setEventCounts] = useState<Partial<Record<TourEventName, number>>>({});
  const [entryEventCounts, setEntryEventCounts] = useState<Partial<Record<TourEventName, number>>>({});
  const [domTick, setDomTick] = useState(0);
  const [targetInsideMobileMoreSheet, setTargetInsideMobileMoreSheet] = useState(false);

  const step = useMemo(() => steps[stepIndex], [stepIndex]);
  const isMobile = viewport.width < 768;
  const mobileMoreSheetOpen = useMemo(() => {
    if (!isClientReady || !isMobile) return false;
    void domTick;
    return Boolean(findMountedTarget(MOBILE_MORE_SHEET_SELECTOR));
  }, [domTick, isClientReady, isMobile]);
  const routeReady = !step?.route || routeMatches(pathname, step.route);
  const routeFallbackTarget = !routeReady ? getNavTargetForRoute(step?.route, { isMobile, mobileMoreSheetOpen }) : null;
  const mobileMoreFallbackTarget =
    isMobile && step && step.requiresMobileMoreMenu && !mobileMoreSheetOpen
      ? {
          selector: MOBILE_MORE_BUTTON_SELECTOR,
          title: "Open More",
          description: `Tap More in the bottom navigation to reveal ${getStepRevealLabel(step)}.`
        }
      : null;
  const stepTargetMounted = useMemo(() => {
    if (!isClientReady || !routeReady || !step) return true;
    void domTick;
    return Boolean(findMountedTarget(step.selector));
  }, [domTick, isClientReady, routeReady, step]);
  const activeFallbackTarget: TourFallbackTarget | null = routeFallbackTarget
    ? routeFallbackTarget
    : mobileMoreFallbackTarget
      ? mobileMoreFallbackTarget
    : !routeReady || !step || !isClientReady
      ? null
      : stepTargetMounted
        ? null
        : step.missingTargetFallback ?? null;
  const activeSelector = activeFallbackTarget?.selector ?? step?.selector ?? "";
  const activeTitle = activeFallbackTarget?.title ?? step?.title ?? "";
  const activeDescription = activeFallbackTarget?.description ?? step?.description ?? "";
  const activeExample = activeFallbackTarget?.example ?? (!activeFallbackTarget ? step?.example : undefined);
  const hasActiveFallbackTarget = Boolean(activeFallbackTarget);
  const activeSpotlightSelector = hasActiveFallbackTarget ? activeSelector : step?.spotlightSelector ?? activeSelector;
  const canPassiveAdvance =
    Boolean(step?.completionRoute || step?.completionSelectorVisible || step?.completionSelectorMissing);
  const allowMissingTargetContinue = routeReady && !hasActiveFallbackTarget && !stepTargetMounted;

  const markTourShown = useCallback(async () => {
    await fetch("/api/tour/status", {
      method: "PATCH"
    }).catch(() => null);
  }, []);

  const closeTour = useCallback(async () => {
    await markTourShown();
    setOpen(false);
  }, [markTourShown]);

  const advanceStep = useCallback(() => {
    setStepIndex((current) => {
      if (current >= steps.length - 1) {
        void closeTour();
        return current;
      }
      return current + 1;
    });
  }, [closeTour]);

  useEffect(() => {
    setOpen(enabled);
    if (enabled) {
      setStepIndex(0);
    }
  }, [enabled]);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!open || !panelRef.current || typeof window === "undefined") return;

    const syncPanelHeight = () => {
      const nextHeight = Math.ceil(panelRef.current?.getBoundingClientRect().height ?? 0);
      if (!nextHeight) return;
      setPanelHeight((current) => (Math.abs(current - nextHeight) <= 1 ? current : nextHeight));
    };

    syncPanelHeight();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", syncPanelHeight);
      return () => window.removeEventListener("resize", syncPanelHeight);
    }

    const observer = new ResizeObserver(() => syncPanelHeight());
    observer.observe(panelRef.current);
    window.addEventListener("resize", syncPanelHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncPanelHeight);
    };
  }, [activeDescription, activeExample, activeTitle, open, stepIndex]);

  useEffect(() => {
    const syncViewport = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const onTourEvent = (event: Event) => {
      const name = event.type as TourEventName;
      setEventCounts((previous) => ({ ...previous, [name]: (previous[name] ?? 0) + 1 }));
    };

    completionEvents.forEach((name) => {
      window.addEventListener(name, onTourEvent as EventListener);
    });

    return () => {
      completionEvents.forEach((name) => {
        window.removeEventListener(name, onTourEvent as EventListener);
      });
    };
  }, []);

  useEffect(() => {
    setClickedCurrentStep(false);
    setEntryEventCounts(eventCounts);
  }, [stepIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !step) return;

    let mounted = true;

    const syncTarget = () => {
      const visibleSpotlightTarget = findVisibleTarget(activeSpotlightSelector) ?? findVisibleTarget(activeSelector);
      const mountedActiveTarget = findVisibleTarget(activeSelector) ?? findMountedTarget(activeSelector);
      setTargetInsideMobileMoreSheet(Boolean(mountedActiveTarget?.closest(MOBILE_MORE_SHEET_SELECTOR)));

      if (!visibleSpotlightTarget) {
        setTargetRect(null);
        return;
      }
      setTargetRect(visibleSpotlightTarget.getBoundingClientRect());
    };

    syncTarget();

    const timer = window.setTimeout(() => {
      if (!mounted) return;
      const target =
        findVisibleTarget(activeSpotlightSelector) ??
        findMountedTarget(activeSpotlightSelector) ??
        findVisibleTarget(activeSelector) ??
        findMountedTarget(activeSelector);
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      syncTarget();
    }, 120);

    const interval = window.setInterval(syncTarget, 260);
    const onResize = () => syncTarget();
    const onScroll = () => syncTarget();

    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [activeSelector, activeSpotlightSelector, open, step, pathname]);

  useEffect(() => {
    if (!open) return;

    const bump = () => setDomTick((value) => value + 1);
    const interval = window.setInterval(bump, 220);
    const onInput = () => bump();
    const onChange = () => bump();
    const onFocus = () => bump();

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onChange, true);
    document.addEventListener("focusin", onFocus, true);

    const observer = new MutationObserver(() => bump());
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: false });

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onChange, true);
      document.removeEventListener("focusin", onFocus, true);
      observer.disconnect();
    };
  }, [open]);

  const completionSatisfied = useMemo(() => {
    if (!step) return false;
    void domTick;

    if (step.route && !routeMatches(pathname, step.route)) {
      return false;
    }

    if (step.completionRoute && !routeMatches(pathname, step.completionRoute)) {
      return false;
    }

    if (step.completionSelectorVisible && !findVisibleTarget(step.completionSelectorVisible)) {
      return false;
    }

    if (step.completionSelectorMissing && findVisibleTarget(step.completionSelectorMissing)) {
      return false;
    }

    if (step.completionInputContains) {
      const value = readInputValue(step.completionInputContains.selector);
      if (!value.toLowerCase().includes(step.completionInputContains.valueIncludes.toLowerCase())) {
        return false;
      }
    }

    if (step.completionEvent) {
      const current = eventCounts[step.completionEvent] ?? 0;
      const baseline = entryEventCounts[step.completionEvent] ?? 0;
      if (current <= baseline) {
        return false;
      }
    }

    return true;
  }, [domTick, entryEventCounts, eventCounts, pathname, step]);

  useEffect(() => {
    if (!open || !step) return;
    if (!routeReady || hasActiveFallbackTarget) return;
    if (!stepHasCompletionRequirement(step)) return;
    if (!completionSatisfied) return;
    if (!clickedCurrentStep && !canPassiveAdvance) return;
    advanceStep();
  }, [advanceStep, canPassiveAdvance, clickedCurrentStep, completionSatisfied, hasActiveFallbackTarget, open, routeReady, step]);

  useEffect(() => {
    if (!open || !step) return;

    const onClickCapture = (event: MouseEvent) => {
      const clickTarget = event.target as Node;

      if (panelRef.current?.contains(clickTarget)) {
        return;
      }

      const activeTarget = findVisibleTarget(activeSelector);
      if (!activeTarget) return;
      if (!activeTarget.contains(clickTarget)) return;

      if (hasActiveFallbackTarget) {
        return;
      }

      if (clickedCurrentStep && stepHasCompletionRequirement(step)) {
        return;
      }

      const hasCompletionRequirement = stepHasCompletionRequirement(step);
      if (!hasCompletionRequirement) {
        advanceStep();
        return;
      }

      setClickedCurrentStep(true);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [activeSelector, advanceStep, clickedCurrentStep, hasActiveFallbackTarget, open, step]);

  if (!open || !step) return null;

  const desktopPanelWidth = Math.min(360, Math.max(250, viewport.width - 24));
  const desktopPanelHeight = panelHeight;
  const sidePadding = 12;
  const bottomSafeSpace = isMobile ? 108 : 12;

  let panelStyle: CSSProperties;
  if (isMobile) {
    const safeInset = 10;
    const mobileWidth = Math.min(viewport.width - safeInset * 2, 420);
    const maxHeight = Math.max(208, Math.min(320, Math.floor(viewport.height * 0.32)));
    const estimatedBottomDockTop = viewport.height - maxHeight - 112;
    const targetWouldBeOccluded = Boolean(targetRect && targetRect.bottom >= estimatedBottomDockTop - 8);
    const shouldTopDock =
      step.mobilePanelPlacement === "top" ||
      (step.mobilePanelPlacement !== "bottom" && (targetInsideMobileMoreSheet || targetWouldBeOccluded));

    panelStyle = {
      width: mobileWidth,
      left: clamp((viewport.width - mobileWidth) / 2, safeInset, viewport.width - mobileWidth - safeInset),
      maxHeight,
      overflowY: "auto",
      ...(shouldTopDock
        ? { top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }
        : { bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.75rem)" })
    };
  } else if (targetRect) {
    const placements = desktopPlacementOrder(step.desktopPanelPlacement, targetRect);
    const overlapPadding = targetAvoidancePadding(targetRect);
    const fallbackStyle: CSSProperties = {
      width: desktopPanelWidth,
      top: 12,
      left: 12
    };

    const sidePlacementStyle = placements
      .map((placement) => {
        let top = 12;
        let left = sidePadding;

        if (placement === "right") {
          left = clamp(targetRect.right + 14, sidePadding, viewport.width - desktopPanelWidth - sidePadding);
          top = clamp(targetRect.top + targetRect.height / 2 - desktopPanelHeight / 2, 12, viewport.height - desktopPanelHeight - bottomSafeSpace);
        } else if (placement === "left") {
          left = clamp(targetRect.left - desktopPanelWidth - 14, sidePadding, viewport.width - desktopPanelWidth - sidePadding);
          top = clamp(targetRect.top + targetRect.height / 2 - desktopPanelHeight / 2, 12, viewport.height - desktopPanelHeight - bottomSafeSpace);
        } else if (placement === "top") {
          top = clamp(targetRect.top - desktopPanelHeight - 12, 12, viewport.height - desktopPanelHeight - bottomSafeSpace);
          left = clamp(targetRect.left + targetRect.width / 2 - desktopPanelWidth / 2, sidePadding, viewport.width - desktopPanelWidth - sidePadding);
        } else {
          top = clamp(targetRect.bottom + 12, 12, viewport.height - desktopPanelHeight - bottomSafeSpace);
          left = clamp(targetRect.left + targetRect.width / 2 - desktopPanelWidth / 2, sidePadding, viewport.width - desktopPanelWidth - sidePadding);
        }

        const candidate = { top, left, width: desktopPanelWidth, height: desktopPanelHeight };
        return rectsOverlap(candidate, targetRect, overlapPadding) ? null : candidate;
      })
      .find(Boolean);

    const cornerPlacementStyle = (
      [
        { top: 12, left: sidePadding },
        { top: 12, left: viewport.width - desktopPanelWidth - sidePadding },
        { top: viewport.height - desktopPanelHeight - bottomSafeSpace, left: sidePadding },
        { top: viewport.height - desktopPanelHeight - bottomSafeSpace, left: viewport.width - desktopPanelWidth - sidePadding }
      ] as const
    )
      .map((candidate) => ({
        width: desktopPanelWidth,
        height: desktopPanelHeight,
        top: clamp(candidate.top, 12, viewport.height - desktopPanelHeight - bottomSafeSpace),
        left: clamp(candidate.left, sidePadding, viewport.width - desktopPanelWidth - sidePadding)
      }))
      .filter((candidate, index, array) => {
        const duplicate = array.findIndex((item) => Math.abs(item.top - candidate.top) < 1 && Math.abs(item.left - candidate.left) < 1);
        if (duplicate !== index) return false;
        return !rectsOverlap(candidate, targetRect, overlapPadding);
      })
      .sort((a, b) => distanceBetweenRects(b, targetRect) - distanceBetweenRects(a, targetRect))[0];

    panelStyle = sidePlacementStyle ?? cornerPlacementStyle ?? fallbackStyle;
  } else {
    panelStyle = {
      width: desktopPanelWidth,
      top: 12,
      left: 12
    };
  }

  const hasCompletionRequirement = stepHasCompletionRequirement(step);
  const waitingForCompletion = clickedCurrentStep && hasCompletionRequirement && !completionSatisfied;
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const spotlightPadding = !targetRect ? 0 : step.spotlightSelector && !hasActiveFallbackTarget ? 12 : 6;
  const spotlightRadius = step.spotlightSelector && !hasActiveFallbackTarget ? 30 : 22;
  const spotlightFrame = targetRect
    ? (() => {
        const top = Math.max(0, targetRect.top - spotlightPadding);
        const left = Math.max(0, targetRect.left - spotlightPadding);
        return {
          top,
          left,
          width: Math.max(0, Math.min(viewport.width - left, targetRect.width + spotlightPadding * 2)),
          height: Math.max(0, Math.min(viewport.height - top, targetRect.height + spotlightPadding * 2))
        };
      })()
    : null;
  const spotlightRight = spotlightFrame ? spotlightFrame.left + spotlightFrame.width : 0;
  const spotlightBottom = spotlightFrame ? spotlightFrame.top + spotlightFrame.height : 0;
  return (
    <div className="pointer-events-none fixed inset-0 z-[90]">
      {spotlightFrame ? (
        <>
          <div
            className="absolute inset-x-0 top-0 bg-[rgba(6,5,12,0.34)] backdrop-blur-[7px] transition-all"
            style={{
              height: spotlightFrame.top
            }}
          />
          <div
            className="absolute left-0 bg-[rgba(6,5,12,0.34)] backdrop-blur-[7px] transition-all"
            style={{
              top: spotlightFrame.top,
              width: spotlightFrame.left,
              height: spotlightFrame.height
            }}
          />
          <div
            className="absolute right-0 bg-[rgba(6,5,12,0.34)] backdrop-blur-[7px] transition-all"
            style={{
              top: spotlightFrame.top,
              width: Math.max(0, viewport.width - spotlightRight),
              height: spotlightFrame.height
            }}
          />
          <div
            className="absolute inset-x-0 bg-[rgba(6,5,12,0.34)] backdrop-blur-[7px] transition-all"
            style={{
              top: spotlightBottom,
              height: Math.max(0, viewport.height - spotlightBottom)
            }}
          />
          <div
            className="absolute border-2 border-[#9A8CFF] bg-[#9A8CFF]/6 shadow-[0_20px_44px_rgba(123,108,246,0.18)] transition-all"
            style={{
              top: spotlightFrame.top,
              left: spotlightFrame.left,
              width: spotlightFrame.width,
              height: spotlightFrame.height,
              borderRadius: spotlightRadius
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[rgba(6,5,12,0.28)] backdrop-blur-[6px]" />
      )}

      <div
        ref={panelRef}
        className="pointer-events-auto absolute overflow-hidden rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] p-4 shadow-[var(--glass-shadow-deep)] backdrop-blur-[24px]"
        style={panelStyle}
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-[color:var(--chart-grid)]">
          <div className="h-full rounded-r-full bg-[#7B6CF6]" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--tertiary-foreground)]">
              Guided Tour
            </p>
            <h3 className="mt-1 font-headline text-[28px] tracking-[-0.02em] text-[var(--foreground)]">{activeTitle}</h3>
          </div>
          <div className="surface-pill rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
            {stepIndex + 1}/{steps.length}
          </div>
        </div>

        <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{activeDescription}</p>
        {activeExample ? (
          <p className="mt-3 rounded-[18px] border border-[#C4B5FD]/55 bg-[#7B6CF6]/8 px-3 py-2 text-xs font-medium leading-5 text-[#5B4FC8] dark:border-[#7B6CF6]/30 dark:bg-[#7B6CF6]/14 dark:text-[#DDD6FE]">
            {activeExample}
          </p>
        ) : null}
        <p className="mt-3 text-xs font-medium text-[var(--tertiary-foreground)]">
          {allowMissingTargetContinue
            ? "This step is unavailable in the current page state. You can continue and come back later."
            : !targetRect
              ? "Finding this element..."
              : waitingForCompletion
                ? "Finishing this step..."
                : hasActiveFallbackTarget
                  ? "Click the highlighted item first."
                  : "Click the highlighted item to continue."}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            className="rounded-full px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[color:var(--ghost-hover)] hover:text-[var(--foreground)]"
            onClick={() => void closeTour()}
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {allowMissingTargetContinue ? (
              <Button size="sm" variant="secondary" className="rounded-full" onClick={advanceStep}>
                Continue
              </Button>
            ) : null}
            {stepIndex > 0 ? (
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStepIndex((current) => Math.max(0, current - 1))}>
                Back
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

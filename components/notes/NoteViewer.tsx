"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  IconAlertCircle,
  IconArrowRight,
  IconArrowLeft,
  IconCheck,
  IconFileDownload,
  IconPointFilled,
  IconPhotoPlus,
  IconPrinter,
  IconRefresh,
  IconSparkles,
  IconStarFilled,
  IconZoomIn,
  IconZoomOut
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { SimplifierSlider } from "@/components/notes/SimplifierSlider";
import { cn } from "@/lib/utils";
import { SUBJECT_COLORS } from "@/lib/constants";
import { extractNoteDiagramPlaceholders, NOTE_BLOCK_TAGS, NOTE_INLINE_HIGHLIGHT_TAGS, parseNoteBlocks } from "@/lib/note-content";
import { NOTE_VISUAL_UNAVAILABLE_MESSAGE, toUserFacingNoteVisualMessage } from "@/lib/note-visual-copy";
import type { NoteVisual } from "@/types";

interface Props {
  noteId: string;
  title: string;
  subject: string;
  createdAt: string;
  content: string;
  visualGenerationStatus?: "idle" | "ready" | "partial_error" | "error";
  visualGenerationError?: string;
  visuals?: NoteVisual[];
}

const NOTE_BLOCK_MARKER_REGEX = new RegExp(`\\[\\s*\\/?\\s*(?:${NOTE_BLOCK_TAGS.join("|")})\\s*\\]`, "gi");

function renderInlineHighlights(text: string) {
  const pattern = new RegExp(
    `(${NOTE_INLINE_HIGHLIGHT_TAGS.map((tag) => `\\[${tag}\\][\\s\\S]*?\\[\\/${tag}\\]`).join("|")})`,
    "g"
  );
  const parts = text.split(pattern).filter(Boolean);

  const styleMap: Record<string, string> = {
    HIGHLIGHT_YELLOW: "bg-[#FEF08A] text-black font-semibold",
    HIGHLIGHT_GREEN: "bg-[#BBF7D0] text-[#065F46]",
    HIGHLIGHT_PINK: "bg-[#FBCFE8] text-[#9D174D]",
    HIGHLIGHT_BLUE: "bg-[#BAE6FD] text-[#1E3A8A]",
    HIGHLIGHT_ORANGE: "bg-[#FED7AA] text-[#9A3412]"
  };

  return parts.map((part, index) => {
    const hit = part.match(/^\[([A-Z_]+)\]([\s\S]*?)\[\/\1\]$/);
    if (!hit || !styleMap[hit[1]]) {
      const cleanPart = part.replace(NOTE_BLOCK_MARKER_REGEX, " ").replace(/\s+/g, " ").trim();
      return <span key={index}>{cleanPart} </span>;
    }

    return (
      <span key={index} className={cn("mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5", styleMap[hit[1]])}>
        {hit[2].trim()}
      </span>
    );
  });
}

function NoteVisualPanel({
  description,
  visual,
  loading,
  failed
}: {
  description: string;
  visual?: NoteVisual;
  loading: boolean;
  failed: boolean;
}) {
  return (
    <section className="surface-card rounded-[24px] p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--tertiary-foreground)]">
          <IconSparkles className={cn("h-3.5 w-3.5 text-[#7B6CF6]", loading && "animate-spin")} />
          Study Visual
        </p>
        {visual ? <span className="text-xs text-[var(--muted-foreground)]">Ready to review</span> : null}
      </div>

      {visual ? (
        <div className="overflow-hidden rounded-[20px] border border-[color:var(--note-border)] bg-white">
          <Image
            src={visual.imageUrl}
            alt={description}
            width={1600}
            height={1200}
            className="block h-auto w-full object-cover"
            unoptimized
          />
        </div>
      ) : (
        <div className="surface-dashed flex min-h-[220px] items-center justify-center rounded-[20px] px-5 py-8 text-center">
          <div className="max-w-sm space-y-2">
            <IconPhotoPlus className={cn("mx-auto h-6 w-6 text-[#7B6CF6]", loading && "animate-pulse")} />
            <p className="text-sm font-medium text-[var(--foreground)]">
              {loading ? "Generating a clean study visual..." : failed ? "This illustration is not available right now." : "Preparing illustration..."}
            </p>
            <p className="text-xs leading-5 text-[var(--muted-foreground)]">
              {loading ? "StudyOS is preparing a bright, readable educational image." : "You can keep studying without this visual for now."}
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">{description}</p>
    </section>
  );
}

export function NoteViewer({
  noteId,
  title,
  subject,
  createdAt,
  content,
  visualGenerationStatus = "idle",
  visualGenerationError = "",
  visuals: initialVisuals = []
}: Props) {
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [visuals, setVisuals] = useState<NoteVisual[]>(initialVisuals);
  const [unavailableVisualKeys, setUnavailableVisualKeys] = useState<string[]>([]);
  const [visualStatus, setVisualStatus] = useState<"idle" | "loading" | "error">("idle");
  const [visualErrorMessage, setVisualErrorMessage] = useState(() => toUserFacingNoteVisualMessage(visualGenerationError));
  const paperRef = useRef<HTMLDivElement>(null);
  const requestedVisualKeysRef = useRef<Set<string>>(new Set());

  const parsed = useMemo(() => parseNoteBlocks(content), [content]);
  const placeholders = useMemo(() => extractNoteDiagramPlaceholders(content), [content]);
  const parsedTitle = parsed.find((item) => item.tag === "TITLE")?.value;
  const parsedSubject = parsed.find((item) => item.tag === "SUBJECT_TAG")?.value;
  const parsedDate = parsed.find((item) => item.tag === "DATE_TAG")?.value;

  const displayTitle = parsedTitle || title;
  const displaySubject = parsedSubject || subject;
  const displayDate = parsedDate || createdAt.slice(0, 10);
  const flowBlocks = useMemo(() => parsed.filter((item) => item.tag !== "TITLE" && item.tag !== "SUBJECT_TAG" && item.tag !== "DATE_TAG"), [parsed]);
  const visualsByKey = useMemo(() => new Map(visuals.map((visual) => [visual.key, visual])), [visuals]);
  const missingVisualKeys = useMemo(
    () => placeholders.map((placeholder) => placeholder.key).filter((key) => !visualsByKey.has(key)),
    [placeholders, visualsByKey]
  );

  useEffect(() => {
    setVisuals(initialVisuals);
    setUnavailableVisualKeys([]);
    setVisualErrorMessage(toUserFacingNoteVisualMessage(visualGenerationError));
    requestedVisualKeysRef.current = new Set(initialVisuals.map((visual) => visual.key));
  }, [initialVisuals, visualGenerationError]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const syncMode = () => {
      setIsMobile(mediaQuery.matches);
    };

    syncMode();
    mediaQuery.addEventListener("change", syncMode);
    return () => mediaQuery.removeEventListener("change", syncMode);
  }, []);

  useEffect(() => {
    const keysToLoad = missingVisualKeys.filter((key) => !requestedVisualKeysRef.current.has(key));
    if (!noteId || keysToLoad.length === 0) {
      return;
    }

    keysToLoad.forEach((key) => requestedVisualKeysRef.current.add(key));
    let active = true;
    setVisualStatus("loading");

    async function loadVisuals() {
      try {
        const response = await fetch(`/api/notes/${noteId}/visuals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keys: keysToLoad })
        });
        const data = await response.json().catch(() => ({}));
        if (!active) return;

        if (!response.ok) {
          setUnavailableVisualKeys((prev) => Array.from(new Set([...prev, ...keysToLoad])));
          setVisualErrorMessage(toUserFacingNoteVisualMessage(typeof data.error === "string" ? data.error : NOTE_VISUAL_UNAVAILABLE_MESSAGE));
          setVisualStatus("error");
          return;
        }

        if (Array.isArray(data.visuals)) {
          const nextVisuals = data.visuals as NoteVisual[];
          const availableKeys = new Set(nextVisuals.map((visual) => visual.key));
          const unresolvedKeys = keysToLoad.filter((key) => !availableKeys.has(key));
          setVisuals(nextVisuals);
          if (unresolvedKeys.length > 0) {
            setUnavailableVisualKeys((prev) => Array.from(new Set([...prev, ...unresolvedKeys])));
            setVisualErrorMessage(toUserFacingNoteVisualMessage(typeof data.error === "string" ? data.error : NOTE_VISUAL_UNAVAILABLE_MESSAGE));
            setVisualStatus("error");
            return;
          }
        }
        setVisualErrorMessage(toUserFacingNoteVisualMessage(typeof data.error === "string" ? data.error : ""));
        setVisualStatus("idle");
      } catch (error) {
        if (!active) return;
        console.error("Failed to load note visuals", error);
        setUnavailableVisualKeys((prev) => Array.from(new Set([...prev, ...keysToLoad])));
        setVisualErrorMessage(NOTE_VISUAL_UNAVAILABLE_MESSAGE);
        setVisualStatus("error");
      }
    }

    void loadVisuals();
    return () => {
      active = false;
    };
  }, [missingVisualKeys, noteId]);

  async function exportPdf() {
    if (!paperRef.current) return;

    toast.loading("Downloading your note...", { id: "pdf-download" });
    const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const canvas = await html2canvas(paperRef.current, {
      backgroundColor: "#ffffff",
      useCORS: true,
      scale: 2
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeightPx = 1123 * 2;

    for (let y = 0, page = 0; y < canvas.height; y += pageHeightPx, page += 1) {
      const segmentCanvas = document.createElement("canvas");
      segmentCanvas.width = canvas.width;
      segmentCanvas.height = Math.min(pageHeightPx, canvas.height - y);

      const context = segmentCanvas.getContext("2d");
      if (!context) break;

      context.drawImage(canvas, 0, y, canvas.width, segmentCanvas.height, 0, 0, segmentCanvas.width, segmentCanvas.height);

      const imageData = segmentCanvas.toDataURL("image/png");
      const renderedHeight = (segmentCanvas.height * pdfWidth) / segmentCanvas.width;
      if (page > 0) pdf.addPage();
      pdf.addImage(imageData, "PNG", 0, 0, pdfWidth, renderedHeight);
    }

    pdf.setProperties({ title: displayTitle, author: "StudyOS" });
    pdf.save(`${displayTitle}.pdf`);
    toast.success("Note downloaded as PDF", { id: "pdf-download" });
  }

  function backFromReader() {
    router.push("/dashboard/study?tool=notes");
  }

  async function retryVisualGeneration() {
    const retryKeys = placeholders
      .map((placeholder) => placeholder.key)
      .filter((key) => unavailableVisualKeys.includes(key) || !visualsByKey.has(key));

    if (!retryKeys.length) {
      setVisualErrorMessage("");
      return;
    }

    setVisualStatus("loading");
    setVisualErrorMessage("");
    setUnavailableVisualKeys([]);

    try {
      const response = await fetch(`/api/notes/${noteId}/visuals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: retryKeys })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setUnavailableVisualKeys(retryKeys);
        setVisualErrorMessage(toUserFacingNoteVisualMessage(typeof data.error === "string" ? data.error : NOTE_VISUAL_UNAVAILABLE_MESSAGE));
        setVisualStatus("error");
        return;
      }

      if (Array.isArray(data.visuals)) {
        setVisuals(data.visuals as NoteVisual[]);
      }

      const nextVisuals = Array.isArray(data.visuals) ? (data.visuals as NoteVisual[]) : visuals;
      const nextVisualKeys = new Set(nextVisuals.map((visual) => visual.key));
      const stillMissing = retryKeys.filter((key) => !nextVisualKeys.has(key));
      if (stillMissing.length) {
        setUnavailableVisualKeys(stillMissing);
        setVisualErrorMessage(toUserFacingNoteVisualMessage(typeof data.error === "string" ? data.error : NOTE_VISUAL_UNAVAILABLE_MESSAGE));
        setVisualStatus("error");
        return;
      }

      setVisualErrorMessage("");
      setVisualStatus("idle");
      toast.success("Study visuals generated.");
    } catch (error) {
      console.error("Failed to retry note visuals", error);
      setUnavailableVisualKeys(retryKeys);
      setVisualErrorMessage(NOTE_VISUAL_UNAVAILABLE_MESSAGE);
      setVisualStatus("error");
    }
  }

  const effectiveZoom = isMobile ? 1 : zoom;
  let diagramOrdinal = -1;
  const shouldShowVisualWarning =
    placeholders.length > 0 &&
    (visualGenerationStatus === "error" ||
      visualGenerationStatus === "partial_error" ||
      visualStatus === "error" ||
      Boolean(visualErrorMessage));

  return (
    <>
      <div
        className={cn(
          "space-y-5 pb-6",
          isMobile && "fixed inset-0 z-[70] overflow-y-auto bg-[linear-gradient(180deg,var(--background-strong)_0%,var(--background)_100%)] p-2 sm:p-4"
        )}
      >
        {shouldShowVisualWarning ? (
          <div className="no-print mx-auto flex max-w-[960px] flex-col gap-3 rounded-[24px] border border-[rgba(245,158,11,0.28)] bg-[rgba(255,247,237,0.94)] px-4 py-4 text-sm text-[#92400E] shadow-[var(--panel-shadow)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <IconAlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-[#7C2D12]">
                    Some study visuals are not available yet.
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#9A3412]">
                    {visualErrorMessage || "You can keep studying now and retry the missing visuals later."}
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => void retryVisualGeneration()} disabled={visualStatus === "loading"}>
                <IconRefresh className={cn("mr-1 h-3.5 w-3.5", visualStatus === "loading" && "animate-spin")} />
                {visualStatus === "loading" ? "Retrying..." : "Retry visuals"}
              </Button>
            </div>
          </div>
        ) : null}

        <div
          id="note-toolbar"
          className={cn(
            "glass-nav no-print z-10 overflow-x-auto rounded-full border border-[color:var(--panel-border)] p-2 shadow-[var(--panel-shadow)] backdrop-blur-[20px]",
            isMobile ? "fixed bottom-3 left-3 right-3" : "sticky top-4 mx-auto w-fit"
          )}
        >
          <div className="flex w-max items-center gap-2">
            {isMobile ? (
              <Button size="sm" variant="outline" onClick={backFromReader}>
                <IconArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={exportPdf}>
              <IconFileDownload className="mr-1 h-3.5 w-3.5" />
              PDF Export
            </Button>
            {!isMobile ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(2))))}>
                  <IconZoomIn className="mr-1 h-3.5 w-3.5" />
                  Zoom In
                </Button>
                <Button size="sm" variant="outline" onClick={() => setZoom((value) => Math.max(0.9, Number((value - 0.1).toFixed(2))))}>
                  <IconZoomOut className="mr-1 h-3.5 w-3.5" />
                  Zoom Out
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}>
                  <IconPrinter className="mr-1 h-3.5 w-3.5" />
                  Print
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-hidden pb-20 md:pb-5">
          <div
            className={cn(
              "mx-auto origin-top transition-transform duration-200",
              isMobile ? "w-full max-w-[980px] px-1 pt-2 sm:px-4 sm:pt-3" : "w-[min(900px,calc(100vw-1.5rem))] sm:w-[min(900px,calc(100vw-3rem))]"
            )}
            style={{ transform: `scale(${effectiveZoom})` }}
          >
            <div
              id="note-paper"
              ref={paperRef}
              className="note-surface relative min-h-[calc(100dvh-7rem)] overflow-hidden rounded-[28px] px-4 pb-8 pt-6 sm:min-h-[1123px] sm:px-10 sm:pb-12 sm:pt-10"
            >
            <header className="relative z-[1] mb-8 border-b border-[color:var(--note-border)] pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={cn(
                    "note-handwritten-meta rounded-full px-3 py-1 text-[0.78rem]",
                    SUBJECT_COLORS[displaySubject] ?? SUBJECT_COLORS.Other
                  )}
                >
                  {displaySubject}
                </span>
                <span className="note-handwritten-meta text-[0.9rem] text-[var(--note-muted-foreground)]">{displayDate}</span>
              </div>
              <h1 className="note-handwritten-heading mt-4 text-[3rem] text-[var(--note-foreground)] sm:text-[3.75rem]">{displayTitle}</h1>
            </header>

            <div className="note-handwritten-body relative z-[1] space-y-4 text-[1.35rem] text-[var(--note-foreground)] sm:text-[1.55rem]">
              {flowBlocks.map((block, idx) => {
                if (block.tag === "MARGIN_NOTE") {
                  return null;
                }

                if (block.tag === "HEADING1") {
                  return (
                    <section key={idx} className="pt-2">
                      <h2 className="note-handwritten-heading text-[2.1rem] text-[var(--note-foreground)] sm:text-[2.6rem]">
                        {renderInlineHighlights(block.value ?? "")}
                      </h2>
                    </section>
                  );
                }

                if (block.tag === "HEADING2") {
                  return (
                    <h3 key={idx} className="note-handwritten-heading text-[1.7rem] text-[#1F4C8F] sm:text-[1.95rem]">
                      {renderInlineHighlights(block.value ?? "")}
                    </h3>
                  );
                }

                if (block.tag === "HEADING3") {
                  return (
                    <h4 key={idx} className="note-handwritten-heading text-[1.45rem] uppercase tracking-[0.08em] text-[#51627C] sm:text-[1.6rem]">
                      {renderInlineHighlights(block.value ?? "")}
                    </h4>
                  );
                }

                if (block.tag === "STICKY_YELLOW" || block.tag === "STICKY_PINK" || block.tag === "STICKY_BLUE") {
                  const tone = {
                    STICKY_YELLOW: "border-[#F6D365] bg-[#FFF9E7] text-[#5B4A1B]",
                    STICKY_PINK: "border-[#F5B6CC] bg-[#FFF0F6] text-[#7D3554]",
                    STICKY_BLUE: "border-[#9CC8F5] bg-[#EEF6FF] text-[#244C71]"
                  }[block.tag];

                  return (
                    <aside key={idx} className={cn("rounded-[18px] border p-4 text-sm leading-6 shadow-[0_8px_20px_rgba(15,23,42,0.05)]", tone)}>
                      {renderInlineHighlights(block.value ?? "")}
                    </aside>
                  );
                }

                if (block.tag === "STAR_POINT" || block.tag === "ARROW_POINT" || block.tag === "CHECK_POINT" || block.tag === "BULLET_POINT") {
                  const symbolMap: Record<
                    string,
                    {
                      icon: typeof IconStarFilled;
                      className: string;
                    }
                  > = {
                    STAR_POINT: { icon: IconStarFilled, className: "text-[#FBBF24]" },
                    ARROW_POINT: { icon: IconArrowRight, className: "text-[#3B82F6]" },
                    CHECK_POINT: { icon: IconCheck, className: "text-[#10B981]" },
                    BULLET_POINT: { icon: IconPointFilled, className: "text-[#6B7280]" }
                  };
                  const item = symbolMap[block.tag];
                  const ItemIcon = item.icon;

                  return (
                    <p key={idx} className="flex items-start gap-3">
                      <span className={cn("mt-1 inline-flex shrink-0", item.className)}>
                        <ItemIcon className="h-4 w-4" />
                      </span>
                      <span className="flex-1">{renderInlineHighlights(block.value ?? "")}</span>
                    </p>
                  );
                }

                if (block.tag === "FORMULA_BOX") {
                  return (
                    <section key={idx} className="rounded-[20px] border border-[#C8D8F7] bg-[#F6F9FF] p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#4E6EA8]">Formula</p>
                      <p className="text-center font-semibold text-[var(--note-foreground)]">{renderInlineHighlights(block.value ?? "")}</p>
                    </section>
                  );
                }

                if (block.tag === "DEFINITION_BOX") {
                  const [term, meaning] = (block.value ?? "").split("::").map((part) => part?.trim());
                  return (
                    <section key={idx} className="rounded-[20px] border border-[#BEE3D5] bg-[#F3FBF8] p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#236B5A]">Definition</p>
                      <p>
                        <span className="font-semibold">{renderInlineHighlights(term ?? "")}</span>
                        {meaning ? <span> :: {renderInlineHighlights(meaning)}</span> : null}
                      </p>
                    </section>
                  );
                }

                if (block.tag === "EXAMPLE_BOX") {
                  return (
                    <section key={idx} className="rounded-[20px] border border-[#F0D3A4] bg-[#FFF8EC] p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#9A6A18]">Example</p>
                      <p>{renderInlineHighlights(block.value ?? "")}</p>
                    </section>
                  );
                }

                if (block.tag === "MEMORY_BOX") {
                  return (
                    <section key={idx} className="rounded-[20px] border border-[#D8CCF7] bg-[#F8F5FF] p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#6950AE]">Remember</p>
                      <p>{renderInlineHighlights(block.value ?? "")}</p>
                    </section>
                  );
                }

                if (block.tag === "DIAGRAM_PLACEHOLDER") {
                  diagramOrdinal += 1;
                  const placeholder = placeholders[diagramOrdinal];
                  const visual = placeholder ? visualsByKey.get(placeholder.key) : undefined;

                  return (
                    <NoteVisualPanel
                      key={placeholder?.key ?? `${block.tag}-${idx}`}
                      description={placeholder?.description ?? block.value ?? "Study illustration"}
                      visual={visual}
                      loading={Boolean(placeholder && !visual && visualStatus === "loading")}
                      failed={Boolean(placeholder && !visual && placeholder && unavailableVisualKeys.includes(placeholder.key))}
                    />
                  );
                }

                if (block.tag === "DIVIDER") {
                  return <div key={idx} className="my-2 h-px w-full bg-[color:var(--note-border)]" />;
                }

                return <p key={idx}>{renderInlineHighlights(block.value ?? "")}</p>;
              })}
            </div>
            </div>
          </div>
        </div>
      </div>
      <div id="simplify-instruction" className="no-print mx-auto max-w-[960px] rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
        Select any part of the note to open the Simplify panel with different explanation levels.
      </div>
      <SimplifierSlider noteId={noteId} subject={displaySubject} topic={displayTitle} />
    </>
  );
}

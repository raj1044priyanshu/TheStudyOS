"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrowUpRight, IconSearch } from "@tabler/icons-react";
import { CompanionBadge } from "@/components/companion/StudyCompanion";
import { Input } from "@/components/ui/input";
import { FloatingPanel, FloatingPanelScrollArea } from "@/components/ui/floating-panel";
import { filterSearchShortcuts } from "@/lib/search-shortcuts";

interface SearchResultItem {
  id: string;
  type: "note" | "quiz" | "planner" | "feature" | "exam" | "revision";
  title: string;
  subtitle: string;
  href: string;
}

interface Props {
  className?: string;
  inputClassName?: string;
}

export function GlobalSearch({ className, inputClassName }: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const trimmedQuery = query.trim();
  const shortcutResults = useMemo(() => filterSearchShortcuts(query).slice(0, 8), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`, {
        signal: controller.signal
      }).catch(() => null);

      if (!response) {
        setSearching(false);
        return;
      }

      const payload = (await response.json().catch(() => ({}))) as { results?: SearchResultItem[] };
      if (!response.ok) {
        setSearching(false);
        return;
      }

      setResults(payload.results ?? []);
      setSearching(false);
      setOpen(true);
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmedQuery]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function openSearchResult(item: SearchResultItem) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(item.href);
  }

  function getResultLabel(type: SearchResultItem["type"]) {
    switch (type) {
      case "note":
        return "Note";
      case "quiz":
        return "Quiz";
      case "planner":
        return "Plan";
      case "exam":
        return "Exam";
      case "revision":
        return "Revision";
      default:
        return "Shortcut";
    }
  }

  return (
    <div ref={containerRef} className={className ?? "relative w-full max-w-[540px]"}>
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--tertiary-foreground)]" />
      <Input
        data-tour-id="dashboard-search"
        placeholder="Find notes, quizzes, exams, profile, and more"
        className={inputClassName ?? "min-h-11 rounded-full pl-11"}
        value={query}
        aria-expanded={open}
        aria-controls={resultsId}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }

          if (event.key === "Enter" && results.length > 0) {
            event.preventDefault();
            openSearchResult(results[0]);
          }
        }}
      />
      {open && (trimmedQuery.length < 2 || searching || results.length > 0 || trimmedQuery.length >= 2) ? (
        <FloatingPanel id={resultsId} className="absolute left-0 right-0 top-[3.25rem] z-50">
          <div className="flex items-start justify-between gap-3 px-2 pb-2 pt-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-700)]">Global search</p>
              <p className="text-sm text-[var(--muted-foreground)]">Find notes, quizzes, revisions, exams, profile, and shortcuts from one place.</p>
            </div>
            <CompanionBadge pose="thinking" size={54} className="shrink-0" />
          </div>
          {trimmedQuery.length < 2 ? (
            <>
              <div className="px-3 pb-2 pt-1 text-xs text-[var(--muted-foreground)]">
                {trimmedQuery.length === 0
                  ? "Quick access for the places students open most."
                  : "Type one more letter to search your saved content. Quick access stays available below."}
              </div>
              {shortcutResults.length ? (
                <FloatingPanelScrollArea className="max-h-[min(60vh,22rem)] space-y-1" role="listbox">
                  {shortcutResults.map((shortcut) => (
                    <button
                      key={shortcut.id}
                      type="button"
                      onClick={() =>
                        openSearchResult({
                          id: shortcut.id,
                          type: "feature",
                          title: shortcut.title,
                          subtitle: shortcut.subtitle,
                          href: shortcut.href
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-transparent px-3 py-3 text-left transition hover:border-[color:var(--panel-border)] hover:bg-[color:var(--nav-hover-bg)]"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)]">{shortcut.title}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{shortcut.subtitle}</p>
                      </div>
                      <span className="inline-flex shrink-0 rounded-full bg-[color:var(--brand-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-700)]">
                        {shortcut.phase}
                      </span>
                    </button>
                  ))}
                </FloatingPanelScrollArea>
              ) : (
                <p className="px-3 py-3 text-sm text-[var(--muted-foreground)]">No quick destination matches that letter yet.</p>
              )}
            </>
          ) : (
            <>
              {searching ? <p className="px-3 py-3 text-sm text-[var(--muted-foreground)]">Searching...</p> : null}
              {!searching && results.length === 0 ? <p className="px-3 py-3 text-sm text-[var(--muted-foreground)]">No matches found.</p> : null}
              {!searching && results.length > 0 ? (
                <FloatingPanelScrollArea className="max-h-[min(60vh,22rem)] space-y-1" role="listbox">
                  {results.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => openSearchResult(item)}
                      className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-transparent px-3 py-3 text-left transition hover:border-[color:var(--panel-border)] hover:bg-[color:var(--nav-hover-bg)]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                          <span className="rounded-full bg-[color:var(--brand-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-700)]">
                            {getResultLabel(item.type)}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--muted-foreground)]">{item.subtitle}</p>
                      </div>
                      <IconArrowUpRight className="h-4 w-4 shrink-0 text-[var(--tertiary-foreground)]" />
                    </button>
                  ))}
                </FloatingPanelScrollArea>
              ) : null}
            </>
          )}
        </FloatingPanel>
      ) : null}
    </div>
  );
}

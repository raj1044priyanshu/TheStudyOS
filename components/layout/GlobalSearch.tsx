"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { FloatingPanel, FloatingPanelScrollArea } from "@/components/ui/floating-panel";

interface SearchResultItem {
  id: string;
  type: "note" | "quiz" | "planner" | "feature";
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

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, {
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
  }, [query]);

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

  return (
    <div ref={containerRef} className={className ?? "relative w-full max-w-[540px]"}>
      <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--tertiary-foreground)]" />
      <Input
        data-tour-id="dashboard-search"
        placeholder="Search notes, quizzes, planner..."
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
      {open && (searching || results.length > 0 || query.trim().length >= 2) ? (
        <FloatingPanel id={resultsId} className="absolute left-0 right-0 top-[3.25rem] z-50">
          {searching ? <p className="px-3 py-3 text-sm text-[var(--muted-foreground)]">Searching...</p> : null}
          {!searching && results.length === 0 ? <p className="px-3 py-3 text-sm text-[var(--muted-foreground)]">No matches found.</p> : null}
          {!searching && results.length > 0 ? (
            <FloatingPanelScrollArea className="max-h-[min(60vh,22rem)] space-y-1" role="listbox">
              {results.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => openSearchResult(item)}
                  className="w-full rounded-[18px] border border-transparent px-3 py-3 text-left transition hover:border-[color:var(--panel-border)] hover:bg-[color:var(--nav-hover-bg)]"
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{item.subtitle}</p>
                </button>
              ))}
            </FloatingPanelScrollArea>
          ) : null}
        </FloatingPanel>
      ) : null}
    </div>
  );
}

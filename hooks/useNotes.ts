"use client";

import { useCallback, useEffect, useState } from "react";
import type { NoteSummary } from "@/types";

export function useNotes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/notes", { cache: "no-store" });
    const data = await response.json();
    setNotes(data.notes ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { notes, loading, refresh, setNotes };
}

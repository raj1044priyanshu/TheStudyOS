"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { IconMap, IconNetwork, IconReceipt, IconRepeat } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { HubPanelFallback } from "@/components/layout/HubPanelFallback";

const RevisionQueue = dynamic(() => import("@/components/revision/RevisionQueue").then((mod) => mod.RevisionQueue), {
  loading: () => <HubPanelFallback text="Loading revision queue..." />
});
const FormulaSheetPage = dynamic(() => import("@/components/formula/FormulaSheetPage").then((mod) => mod.FormulaSheetPage), {
  loading: () => <HubPanelFallback text="Loading formula sheet..." />
});
const MindMapsPanel = dynamic(() => import("@/components/revise/MindMapsPanel").then((mod) => mod.MindMapsPanel), {
  loading: () => <HubPanelFallback text="Loading mind maps..." />
});
const KnowledgeGraphPreview = dynamic(
  () => import("@/components/revise/KnowledgeGraphPreview").then((mod) => mod.KnowledgeGraphPreview),
  {
    loading: () => <HubPanelFallback text="Loading knowledge graph..." />
  }
);

export function ReviseHubPage() {
  const [dueCount, setDueCount] = useState(0);
  const [formulaCount, setFormulaCount] = useState(0);
  const [conceptCount, setConceptCount] = useState(0);

  useEffect(() => {
    async function load() {
      const [revisionResponse, formulaResponse, graphResponse] = await Promise.all([
        fetch("/api/revision/due", { cache: "no-store" }),
        fetch("/api/formula-sheet?subject=all", { cache: "no-store" }),
        fetch("/api/knowledge-graph", { cache: "no-store" })
      ]);

      const revisionPayload = (await revisionResponse.json().catch(() => ({}))) as { due?: unknown[]; items?: unknown[] };
      const formulaPayload = (await formulaResponse.json().catch(() => ({}))) as { sheets?: Array<{ formulas?: unknown[] }> };
      const graphPayload = (await graphResponse.json().catch(() => ({}))) as { total?: number };

      setDueCount((revisionPayload.due ?? revisionPayload.items ?? []).length);
      setFormulaCount((formulaPayload.sheets ?? []).reduce((total, sheet) => total + (sheet.formulas?.length ?? 0), 0));
      setConceptCount(graphPayload.total ?? 0);
    }

    void load();
  }, []);

  const stats = useMemo(
    () => [
      { icon: IconRepeat, label: `${dueCount} items due today` },
      { icon: IconReceipt, label: `${formulaCount} formulas saved` },
      { icon: IconNetwork, label: `${conceptCount} concepts in your graph` }
    ],
    [conceptCount, dueCount, formulaCount]
  );

  return (
    <HubLayout
      phase="revise"
      title="Revise"
      subtitle="Revision is not re-reading. It is recalling, connecting, and simplifying. Use these tools after every study session."
      stats={stats}
      defaultTab="revision-queue"
      tabs={[
        {
          id: "revision-queue",
          icon: IconRepeat,
          label: "Revision Queue",
          description: "See what is due today and clear recall tasks before adding more new material.",
          component: <RevisionQueue />
        },
        {
          id: "formula-sheet",
          icon: IconReceipt,
          label: "Formula Sheet",
          description: "Keep formula-heavy subjects in one place for quick exam-season review.",
          component: <FormulaSheetPage />
        },
        {
          id: "mind-maps",
          icon: IconMap,
          label: "Mind Maps",
          description: "Visualize one topic at a time so the chapter structure stops feeling scattered.",
          component: <MindMapsPanel />
        },
        {
          id: "knowledge-graph",
          icon: IconNetwork,
          label: "Knowledge Graph",
          description: "See cross-topic concept connections and confidence trends from your stored study data.",
          component: <KnowledgeGraphPreview />
        }
      ]}
    />
  );
}

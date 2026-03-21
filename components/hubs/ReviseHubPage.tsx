"use client";

import { useEffect, useMemo, useState } from "react";
import { IconMap, IconNetwork, IconReceipt, IconRepeat } from "@tabler/icons-react";
import { HubLayout } from "@/components/layout/HubLayout";
import { RevisionQueue } from "@/components/revision/RevisionQueue";
import { FormulaSheetPage } from "@/components/formula/FormulaSheetPage";
import { MindMapsPanel } from "@/components/revise/MindMapsPanel";
import { KnowledgeGraphPreview } from "@/components/revise/KnowledgeGraphPreview";

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
        { id: "revision-queue", icon: IconRepeat, label: "Revision Queue", component: <RevisionQueue /> },
        { id: "formula-sheet", icon: IconReceipt, label: "Formula Sheet", component: <FormulaSheetPage /> },
        { id: "mind-maps", icon: IconMap, label: "Mind Maps", component: <MindMapsPanel /> },
        { id: "knowledge-graph", icon: IconNetwork, label: "Knowledge Graph", component: <KnowledgeGraphPreview /> }
      ]}
    />
  );
}

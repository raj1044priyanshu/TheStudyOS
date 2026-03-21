"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";

interface GraphNode extends Node {
  data: {
    label: string;
    subject: string;
    confidence: number;
  };
}

type GraphEdge = Edge;

interface GraphPayload {
  nodes: GraphNode[];
  edges: GraphEdge[];
  total: number;
}

export function KnowledgeGraphPreview() {
  const [graph, setGraph] = useState<GraphPayload | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/knowledge-graph", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as GraphPayload | null;
      if (response.ok && data) {
        setGraph(data);
      }
    }

    void load();
  }, []);

  const weakNodes = useMemo(
    () =>
      (graph?.nodes ?? [])
        .filter((node) => node.data.confidence < 40)
        .slice(0, 5)
        .sort((a, b) => a.data.confidence - b.data.confidence),
    [graph?.nodes]
  );

  const previewNodes = useMemo(() => graph?.nodes.slice(0, 24) ?? [], [graph?.nodes]);
  const previewEdges = useMemo(
    () => (graph?.edges ?? []).filter((edge) => previewNodes.some((node) => node.id === edge.source) && previewNodes.some((node) => node.id === edge.target)),
    [graph?.edges, previewNodes]
  );

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--surface-low)]">
        <div className="h-[400px]">
          {graph ? (
            <ReactFlow nodes={previewNodes} edges={previewEdges} fitView proOptions={{ hideAttribution: true }}>
              <Background color="#ddd8ef" gap={24} />
              <Controls position="top-right" />
            </ReactFlow>
          ) : (
            <div className="h-full animate-pulse bg-white/60 dark:bg-white/5" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[var(--foreground)]">Top weak concepts</p>
          <p className="text-sm text-[var(--muted-foreground)]">{graph?.total ?? 0} concepts in your graph</p>
        </div>
        <Link href="/dashboard/knowledge-graph" className="contents">
          <Button variant="outline">Open Full Graph</Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {weakNodes.length ? (
          weakNodes.map((node) => (
            <div key={node.id} className="glass-card rounded-[24px] p-5">
              <p className="font-headline text-3xl tracking-[-0.03em] text-[var(--foreground)]">{node.data.label}</p>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">{node.data.subject}</p>
              <span className="mt-4 inline-flex rounded-full bg-[#FCA5A5]/18 px-3 py-1 text-xs font-medium text-[#B91C1C]">
                {node.data.confidence}% confidence
              </span>
            </div>
          ))
        ) : (
          <div className="glass-card rounded-[24px] p-5 text-sm text-[var(--muted-foreground)]">No weak concepts surfaced yet.</div>
        )}
      </div>
    </div>
  );
}

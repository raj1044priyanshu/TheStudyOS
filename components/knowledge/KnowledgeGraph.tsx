"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Background, Controls, ReactFlow, ReactFlowProvider, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { SUBJECTS } from "@/lib/constants";
import { ConceptFlowNode } from "@/components/knowledge/ConceptFlowNode";
import { cn } from "@/lib/utils";

type GraphNode = Node<{ label: string; subject: string; confidence: number; source: string; sourceTitle?: string; sourceId?: string }>;
type GraphEdge = Edge;

function KnowledgeGraphInner() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [subjectFilters, setSubjectFilters] = useState<string[]>([]);
  const [showWeakOnly, setShowWeakOnly] = useState(false);
  const [mobileList, setMobileList] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/knowledge-graph", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) {
        setNodes((data.nodes ?? []).map((node: GraphNode) => ({ ...node, type: "concept" })));
        setEdges(data.edges ?? []);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobileList(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const visibleNodes = useMemo(() => {
    return nodes.filter((node) => {
      const subjectAllowed = !subjectFilters.length || subjectFilters.includes(node.data.subject);
      const searchAllowed = !search || node.data.label.toLowerCase().includes(search.toLowerCase());
      const weakAllowed = !showWeakOnly || node.data.confidence < 40;
      return subjectAllowed && searchAllowed && weakAllowed;
    });
  }, [nodes, subjectFilters, search, showWeakOnly]);

  const visibleNodeIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = useMemo(() => edges.filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)), [edges, visibleNodeIds]);

  async function exportPng() {
    if (!wrapperRef.current) return;
    const canvas = await html2canvas(wrapperRef.current);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "studyos-knowledge-graph.png";
    link.click();
  }

  if (!nodes.length) {
    return <EmptyState title="Your knowledge graph will appear here as you study." description="Generate notes, complete quizzes, and revisit flashcards to grow your concept map." />;
  }

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Connections</p>
          <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Knowledge Graph</h2>
        </div>
        <Button variant="outline" onClick={() => void exportPng()}>
          Export as PNG
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search concepts" className="max-w-xs" />
        <button
          type="button"
          onClick={() => setShowWeakOnly((value) => !value)}
          className={`rounded-full border px-4 py-2 text-sm ${showWeakOnly ? "bg-[#EF4444] text-white" : "border-[color:var(--panel-border)] text-[var(--muted-foreground)]"}`}
        >
          Show weak only
        </button>
        {SUBJECTS.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() =>
              setSubjectFilters((prev) => (prev.includes(subject) ? prev.filter((item) => item !== subject) : [...prev, subject]))
            }
            className={`rounded-full border px-3 py-2 text-xs ${subjectFilters.includes(subject) ? "bg-[#7B6CF6] text-white" : "border-[color:var(--panel-border)] text-[var(--muted-foreground)]"}`}
          >
            {subject}
          </button>
        ))}
      </div>

      {mobileList ? (
        <div className="space-y-3">
          {visibleNodes.map((node) => (
            <button key={node.id} type="button" onClick={() => setSelectedNode(node)} className="glass-card block w-full rounded-[24px] p-4 text-left">
              <p className="font-semibold text-[var(--foreground)]">{node.data.label}</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{node.data.subject}</p>
            </button>
          ))}
        </div>
      ) : (
        <div ref={wrapperRef} className="glass-card h-[72vh] overflow-hidden rounded-[30px]">
          <ReactFlow
            nodes={visibleNodes}
            edges={visibleEdges}
            nodeTypes={{ concept: ConceptFlowNode }}
            defaultEdgeOptions={{ animated: false, style: { stroke: "rgba(123,108,246,0.35)" } }}
            onNodeClick={(_, node) => setSelectedNode(node as GraphNode)}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      )}

      {selectedNode ? (
        <aside className="fixed right-4 top-24 z-50 w-full max-w-[320px] rounded-[28px] border border-[color:var(--panel-border)] bg-[color:var(--glass-surface-strong)] p-5 shadow-[var(--glass-shadow-deep)] backdrop-blur-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-headline text-[2rem] tracking-[-0.03em] text-[var(--foreground)]">{selectedNode.data.label}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{selectedNode.data.subject}</p>
            </div>
            <button type="button" onClick={() => setSelectedNode(null)} className="text-sm text-[var(--muted-foreground)]">
              ✕
            </button>
          </div>
          <div className="mt-4 rounded-[20px] bg-[#7B6CF6]/10 px-4 py-3 text-sm text-[#7B6CF6]">Confidence {selectedNode.data.confidence}%</div>
          <p className="mt-4 text-sm text-[var(--muted-foreground)]">From your {selectedNode.data.source}: {selectedNode.data.sourceTitle ?? selectedNode.data.label}</p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href={`/notes?topic=${encodeURIComponent(selectedNode.data.label)}&subject=${encodeURIComponent(selectedNode.data.subject)}`}
              className={cn(buttonVariants({ variant: "default" }))}
            >
              📝 Generate Note
            </Link>
            <Link
              href={`/quiz?topic=${encodeURIComponent(selectedNode.data.label)}&subject=${encodeURIComponent(selectedNode.data.subject)}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              🧪 Quiz Me
            </Link>
            <Link
              href={`/flashcards?topic=${encodeURIComponent(selectedNode.data.label)}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              🃏 Flashcards
            </Link>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

export function KnowledgeGraph() {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphInner />
    </ReactFlowProvider>
  );
}

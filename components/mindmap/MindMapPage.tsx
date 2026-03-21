"use client";

import { useCallback, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import html2canvas from "html2canvas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NextStepCard } from "@/components/shared/NextStepCard";

function decorateNodes(rawNodes: Node[]) {
  return rawNodes.map((node, index) => {
    const isRoot = index === 0;
    return {
      ...node,
      style: isRoot
        ? {
            borderRadius: 22,
            background: "linear-gradient(135deg, #7B6CF6 0%, #A78BFA 100%)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.45)",
            boxShadow: "0 18px 36px rgba(123,108,246,0.22)",
            padding: "12px 16px",
            fontWeight: 600
          }
        : {
            borderRadius: 999,
            background: "rgba(255,255,255,0.72)",
            color: "#1C1B29",
            border: "1px solid rgba(123,108,246,0.28)",
            boxShadow: "0 10px 24px rgba(123,108,246,0.08)",
            padding: "10px 16px",
            fontWeight: 500
          }
    };
  });
}

function decorateEdges(rawEdges: Edge[]) {
  return rawEdges.map((edge) => ({
    ...edge,
    type: "smoothstep",
    animated: false,
    style: {
      stroke: "rgba(123,108,246,0.4)",
      strokeWidth: 2
    }
  }));
}

export function MindMapPage() {
  const [topic, setTopic] = useState("");
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/mindmap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic })
    });
    const data = await response.json();
    setLoading(false);

    if (response.ok) {
      setNodes(decorateNodes(data.nodes ?? []));
      setEdges(decorateEdges(data.edges ?? []));
      window.dispatchEvent(new CustomEvent("tour:mindmap-generated"));
    }
  }, [topic]);

  async function exportPng() {
    const element = document.getElementById("mindmap-canvas");
    if (!element) return;
    const canvas = await html2canvas(element, { backgroundColor: "#f0eef8", scale: 2 });
    const link = document.createElement("a");
    link.download = `${topic || "mindmap"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--tertiary-foreground)]">Visual map</p>
        <h2 className="mt-2 font-headline text-4xl tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl">Mind Map</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-[var(--muted-foreground)]">
          Turn any topic into a structured concept map you can drag, zoom, and export.
        </p>
      </div>

      <div className="glass-card flex flex-wrap gap-2 p-5">
        <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Topic" className="max-w-md" />
        <Button onClick={() => void generate()} disabled={!topic.trim() || loading}>
          {loading ? "Generating..." : "Generate"}
        </Button>
        <Button variant="outline" onClick={() => void exportPng()}>
          Export PNG
        </Button>
      </div>

      <div id="mindmap-canvas" className="glass-card h-[72vh] overflow-hidden rounded-[28px]">
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.18 }}>
          <Background color="#e3ddf2" gap={24} />
          <MiniMap
            pannable
            zoomable
            style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.8)" }}
          />
          <Controls
            style={{
              background: "rgba(255,255,255,0.72)",
              border: "1px solid rgba(255,255,255,0.8)",
              borderRadius: 16
            }}
          />
        </ReactFlow>
      </div>

      {nodes.length > 0 ? (
        <NextStepCard
          suggestions={[
            {
              icon: "",
              title: "Generate detailed notes on this topic",
              description: "Use the structure you just mapped to build the full written explanation next.",
              href: `/dashboard/study?tool=notes&topic=${encodeURIComponent(topic)}`
            },
            {
              icon: "",
              title: "Quiz yourself on the full topic",
              description: "Check whether the branches in the map are actually sticking in memory.",
              href: `/dashboard/test?tool=quiz&topic=${encodeURIComponent(topic)}`
            }
          ]}
        />
      ) : null}
    </div>
  );
}

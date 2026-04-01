import { NextResponse } from "next/server";
import { z } from "zod";
import { applyRouteRateLimit, parseJsonString, requireUser } from "@/lib/api";
import { generateText as generateContent } from "@/lib/content-service";

const schema = z.object({
  description: z.string().min(6).max(400),
  subject: z.string().min(2).max(80).optional()
});

type DiagramNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  shape: "rect" | "ellipse" | "diamond";
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export async function POST(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`diagram:${authResult.userId}`);
  if (rate) return rate;

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { description, subject } = parsed.data;

  const prompt = `Create a simple illustrative classroom sketch blueprint for students.
Topic: ${description}
Subject: ${subject ?? "General"}
Return ONLY JSON in this exact format:
{
  "title": "short title",
  "nodes": [
    { "id": "n1", "label": "label", "x": 20, "y": 20, "shape": "rect|ellipse|diamond" }
  ],
  "edges": [
    { "from": "n1", "to": "n2", "label": "optional short label" }
  ]
}
Rules:
- 3 to 6 nodes
- x and y are percentage positions from 10 to 90
- concise student-friendly labels
- keep it illustrative, not authoritative
- if the topic is unclear, return a generic flow diagram`;

  try {
    const raw = await generateContent(prompt);
    const json = parseJsonString(raw) as {
      title?: string;
      nodes?: Array<{ id?: string; label?: string; x?: number; y?: number; shape?: string }>;
      edges?: Array<{ from?: string; to?: string; label?: string }>;
    };

    const nodes: DiagramNode[] = (json.nodes ?? [])
      .slice(0, 6)
      .map((node, index) => ({
        id: node.id?.trim() || `n${index + 1}`,
        label: node.label?.trim() || `Step ${index + 1}`,
        x: clamp(Number(node.x ?? 20 + index * 12), 10, 90),
        y: clamp(Number(node.y ?? 20 + index * 10), 10, 90),
        shape: node.shape === "ellipse" || node.shape === "diamond" ? node.shape : "rect"
      }));

    const fallbackNodes: DiagramNode[] = [
      { id: "n1", label: "Start", x: 20, y: 28, shape: "ellipse" },
      { id: "n2", label: "Process", x: 50, y: 28, shape: "rect" },
      { id: "n3", label: "Result", x: 80, y: 28, shape: "rect" }
    ];
    const finalNodes = nodes.length >= 3 ? nodes : fallbackNodes;
    const validNodeIds = new Set(finalNodes.map((node) => node.id));

    const edges = (json.edges ?? [])
      .filter((edge) => edge.from && edge.to && validNodeIds.has(edge.from) && validNodeIds.has(edge.to))
      .slice(0, 8)
      .map((edge) => ({
        from: edge.from!,
        to: edge.to!,
        label: edge.label?.trim() || ""
      }));

    const finalEdges =
      edges.length > 0
        ? edges
        : finalNodes.slice(0, -1).map((node, index) => ({
            from: node.id,
            to: finalNodes[index + 1].id,
            label: ""
          }));

    return NextResponse.json({
      title: json.title?.trim() || "Illustrative sketch",
      nodes: finalNodes,
      edges: finalEdges
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate diagram"
      },
      { status: 502 }
    );
  }
}

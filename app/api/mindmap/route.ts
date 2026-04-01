import { z } from "zod";
import { NextResponse } from "next/server";
import dagre from "@dagrejs/dagre";
import { generateText as generateContent } from "@/lib/content-service";
import { requireUser, applyRouteRateLimit, parseJsonString } from "@/lib/api";
import type { MindMapNodeInput } from "@/types";

const schema = z.object({ topic: z.string().min(2) });

const levelColors = ["#6C63FF", "#43E97B", "#FF6584", "#60A5FA"];

export async function POST(request: Request) {
  const authResult = await requireUser();
  if (authResult.error) return authResult.error;

  const rate = await applyRouteRateLimit(`mindmap:${authResult.userId}`);
  if (rate) return rate;

  const body = schema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
  }

  const response = await generateContent(
    `Create a concise study mind map for '${body.data.topic}'. Return JSON: {"nodes":[{"id":"1","label":"","level":0},{"id":"2","label":"","level":1,"parentId":"1"}]}`
  );

  const parsed = parseJsonString(response) as { nodes: MindMapNodeInput[] };
  const inputNodes = parsed.nodes ?? [];

  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 30 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of inputNodes) {
    graph.setNode(node.id, { width: 190 - node.level * 20, height: 52 });
    if (node.parentId) {
      graph.setEdge(node.parentId, node.id);
    }
  }

  dagre.layout(graph);

  const nodes = inputNodes.map((node) => {
    const pos = graph.node(node.id) ?? { x: 0, y: 0 };
    return {
      id: node.id,
      position: { x: pos.x, y: pos.y },
      data: { label: node.label },
      style: {
        borderRadius: 14,
        background: `${levelColors[node.level % levelColors.length]}22`,
        border: `1px solid ${levelColors[node.level % levelColors.length]}`,
        color: "#0F172A",
        padding: 8
      }
    };
  });

  const edges = inputNodes
    .filter((node) => node.parentId)
    .map((node) => ({ id: `${node.parentId}-${node.id}`, source: node.parentId, target: node.id, animated: false }));

  return NextResponse.json({ nodes, edges });
}

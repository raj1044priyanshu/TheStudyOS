import dagre from "@dagrejs/dagre";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { requireUser, routeError } from "@/lib/api";
import { ConceptNodeModel } from "@/models/ConceptNode";
import type { ConceptRelation } from "@/types";

export async function GET() {
  try {
    const authResult = await requireUser();
    if (authResult.error) return authResult.error;

    await connectToDatabase();
    const conceptNodes = await ConceptNodeModel.find({ userId: authResult.userId })
      .sort({ lastEncountered: -1 })
      .limit(150)
      .lean();

    const graph = new dagre.graphlib.Graph();
    graph.setDefaultEdgeLabel(() => ({}));
    graph.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 70 });

    conceptNodes.forEach((node) => {
      graph.setNode(node._id.toString(), { width: Math.max(120, Math.min(220, 120 + node.confidenceScore)), height: 56 });
    });

    const edges = conceptNodes.flatMap((node) =>
      (node.relatedConcepts ?? []).map((relation: ConceptRelation, index: number) => ({
        id: `${node._id.toString()}-${relation.conceptName}-${index}`,
        source: node._id.toString(),
        target: `${relation.conceptName}:${node.subject}`,
        label: relation.relationship,
        animated: new Date(node.lastEncountered).getTime() > Date.now() - 24 * 60 * 60 * 1000
      }))
    );

    conceptNodes.forEach((node) => {
      for (const relation of node.relatedConcepts ?? []) {
        const targetNode = conceptNodes.find(
          (candidate) =>
            candidate.conceptName.toLowerCase() === relation.conceptName.toLowerCase() &&
            candidate.subject === node.subject
        );
        if (targetNode) {
          graph.setEdge(node._id.toString(), targetNode._id.toString());
        }
      }
    });

    dagre.layout(graph);

    const nodes = conceptNodes.map((node) => {
      const position = graph.node(node._id.toString()) ?? { x: 0, y: 0 };
      return {
        id: node._id.toString(),
        data: {
          label: node.conceptName,
          subject: node.subject,
          confidence: node.confidenceScore,
          source: node.source,
          sourceId: node.sourceId.toString(),
          sourceTitle: node.sourceTitle,
          lastEncountered: new Date(node.lastEncountered).toISOString()
        },
        position: { x: position.x, y: position.y }
      };
    });

    const normalizedEdges = edges.filter((edge) => nodes.some((node) => node.id === edge.source && node.data.label && nodes.some((target) => target.data.label.toLowerCase() === edge.target.split(":")[0].toLowerCase())));

    return NextResponse.json({
      nodes,
      edges: normalizedEdges.map((edge) => {
        const targetNode = nodes.find((node) => node.data.label.toLowerCase() === edge.target.split(":")[0].toLowerCase());
        return targetNode
          ? {
              id: `${edge.source}-${targetNode.id}`,
              source: edge.source,
              target: targetNode.id,
              label: edge.label,
              animated: edge.animated
            }
          : null;
      }).filter(Boolean),
      total: conceptNodes.length,
      truncated: conceptNodes.length >= 150
    });
  } catch (error) {
    return routeError("knowledge-graph:get", error);
  }
}

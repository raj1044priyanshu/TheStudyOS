import { z } from "zod";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { buildValidationErrorResponse, requireRateLimitedUser, routeError } from "@/lib/api";
import { ConceptNodeModel } from "@/models/ConceptNode";

const schema = z.object({
  quizScore: z.number().min(0).max(100)
});

export async function PATCH(request: Request, { params }: { params: { conceptName: string } }) {
  try {
    const authResult = await requireRateLimitedUser(request, {
      policy: "graph",
      key: "knowledge-graph-confidence"
    });
    if (authResult.error) return authResult.error;

    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return buildValidationErrorResponse(parsed.error);
    }

    await connectToDatabase();
    const nodes = await ConceptNodeModel.find({
      userId: authResult.userId,
      conceptName: { $regex: `^${params.conceptName}$`, $options: "i" }
    });

    await Promise.all(
      nodes.map((node) => {
        node.confidenceScore = Math.round(node.confidenceScore * 0.7 + parsed.data.quizScore * 0.3);
        return node.save();
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("knowledge-graph:confidence", error);
  }
}

import { ConceptNodeModel } from "@/models/ConceptNode";
import { generateJsonWithFallback } from "@/lib/ai";
import type { ConceptRelation } from "@/types";

export async function generateRelatedConcepts(conceptName: string, subject: string) {
  const prompt = `Given the concept '${conceptName}' from ${subject},
list up to 5 related academic concepts and describe the relationship
between each pair in 3-5 words.
Return ONLY JSON:
{ "relatedConcepts": [{ "conceptName": "", "relationship": "" }] }`;

  const result = await generateJsonWithFallback<{ relatedConcepts: Array<{ conceptName: string; relationship: string }> }>({
    prompt,
    shape: "object"
  });

  return result.data.relatedConcepts ?? [];
}

export async function upsertConceptNode({
  userId,
  conceptName,
  subject,
  sourceId,
  sourceType,
  sourceTitle
}: {
  userId: string;
  conceptName: string;
  subject: string;
  sourceId: string;
  sourceType: "note" | "quiz" | "doubt" | "flashcard";
  sourceTitle?: string;
}) {
  const relatedConcepts = await generateRelatedConcepts(conceptName, subject);
  const existing = await ConceptNodeModel.findOne({ userId, conceptName, subject });

  if (existing) {
    const merged = new Map(
      existing.relatedConcepts.map((item: ConceptRelation) => [item.conceptName.toLowerCase(), item])
    );
    for (const relation of relatedConcepts) {
      if (!merged.has(relation.conceptName.toLowerCase())) {
        existing.relatedConcepts.push(relation);
      }
    }
    existing.timesEncountered += 1;
    existing.lastEncountered = new Date();
    existing.source = sourceType;
    existing.sourceId = sourceId as never;
    if (sourceTitle) existing.sourceTitle = sourceTitle;
    await existing.save();
    return existing;
  }

  return ConceptNodeModel.create({
    userId,
    conceptName,
    subject,
    source: sourceType,
    sourceId,
    sourceTitle: sourceTitle ?? "",
    relatedConcepts,
    confidenceScore: 50,
    timesEncountered: 1,
    lastEncountered: new Date()
  });
}

export async function updateConceptConfidence(userId: string, subject: string, quizScore: number) {
  const nodes = await ConceptNodeModel.find({ userId, subject });
  await Promise.all(
    nodes.map((node) => {
      node.confidenceScore = Math.round(node.confidenceScore * 0.7 + quizScore * 0.3);
      return node.save();
    })
  );
}

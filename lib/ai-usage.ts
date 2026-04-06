import { connectToDatabase } from "@/lib/mongodb";
import { AiUsageEventModel } from "@/models/AiUsageEvent";

export interface AiUsageLogInput {
  provider: string;
  capability: "text" | "structured" | "multimodal" | "image";
  route?: string;
  model?: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  imageCount?: number;
  latencyMs?: number;
  success: boolean;
  errorCode?: string;
  keyFingerprint?: string;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
}

export async function logAiUsageEvent(input: AiUsageLogInput) {
  try {
    await connectToDatabase();
    await AiUsageEventModel.create({
      provider: input.provider,
      capability: input.capability,
      route: input.route || "unknown",
      model: input.model || "",
      promptTokens: input.promptTokens ?? 0,
      outputTokens: input.outputTokens ?? 0,
      totalTokens: input.totalTokens ?? 0,
      imageCount: input.imageCount ?? 0,
      latencyMs: input.latencyMs ?? 0,
      success: input.success,
      errorCode: input.errorCode || "",
      keyFingerprint: input.keyFingerprint || "",
      userId: input.userId || null,
      entityType: input.entityType || "",
      entityId: input.entityId || ""
    });
  } catch (error) {
    console.error("Failed to log AI usage event", error);
  }
}

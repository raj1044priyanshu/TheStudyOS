import { parseJsonArray, parseJsonString } from "@/lib/api";
import { logAiUsageEvent } from "@/lib/ai-usage";
import {
  generatePrimaryImageWithMetadata,
  generatePrimaryMultimodalText,
  generatePrimaryText,
  generatePrimaryTextWithMetadata
} from "@/lib/content-provider-primary";
import { generateFallbackText, generateFallbackTextWithMetadata } from "@/lib/content-provider-fallback";

export interface AiRequestContext {
  route?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
}

function normalizeStructuredOutput<T>(raw: string, shape: "object" | "array"): T {
  return (shape === "object" ? parseJsonString(raw) : parseJsonArray(raw)) as T;
}

async function recordUsage({
  capability,
  context,
  provider,
  model,
  promptTokens,
  outputTokens,
  totalTokens,
  imageCount,
  success,
  latencyMs,
  errorCode,
  keyFingerprint
}: {
  capability: "text" | "structured" | "multimodal" | "image";
  context?: AiRequestContext;
  provider: string;
  model?: string;
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  imageCount?: number;
  success: boolean;
  latencyMs: number;
  errorCode?: string;
  keyFingerprint?: string;
}) {
  await logAiUsageEvent({
    provider,
    capability,
    route: context?.route,
    model,
    promptTokens,
    outputTokens,
    totalTokens,
    imageCount,
    success,
    latencyMs,
    errorCode,
    keyFingerprint,
    userId: context?.userId,
    entityType: context?.entityType,
    entityId: context?.entityId
  });
}

export async function generateText(prompt: string, systemPrompt?: string, context?: AiRequestContext) {
  const startedAt = Date.now();

  try {
    const text = await generatePrimaryText(prompt, systemPrompt);
    await recordUsage({
      capability: "text",
      context,
      provider: "primary",
      success: true,
      latencyMs: Date.now() - startedAt
    });
    return text;
  } catch (error) {
    await recordUsage({
      capability: "text",
      context,
      provider: "primary",
      success: false,
      latencyMs: Date.now() - startedAt,
      errorCode: error instanceof Error ? error.message : "Primary text generation failed"
    });
    throw error;
  }
}

export async function generateTextWithMetadata(prompt: string, systemPrompt?: string, context?: AiRequestContext) {
  const startedAt = Date.now();

  try {
    const primary = await generatePrimaryTextWithMetadata(prompt, systemPrompt);
    await recordUsage({
      capability: "text",
      context,
      provider: primary.provider,
      model: primary.model,
      promptTokens: primary.usage.promptTokens,
      outputTokens: primary.usage.outputTokens,
      totalTokens: primary.usage.totalTokens,
      success: true,
      latencyMs: Date.now() - startedAt,
      keyFingerprint: primary.keyFingerprint
    });
    return primary;
  } catch (primaryError) {
    await recordUsage({
      capability: "text",
      context,
      provider: "primary",
      success: false,
      latencyMs: Date.now() - startedAt,
      errorCode: primaryError instanceof Error ? primaryError.message : "Primary text generation failed"
    });

    const fallbackStartedAt = Date.now();
    try {
      const fallback = await generateFallbackTextWithMetadata(prompt, systemPrompt);
      await recordUsage({
        capability: "text",
        context,
        provider: fallback.provider,
        model: fallback.model,
        promptTokens: fallback.usage.promptTokens,
        outputTokens: fallback.usage.outputTokens,
        totalTokens: fallback.usage.totalTokens,
        success: true,
        latencyMs: Date.now() - fallbackStartedAt,
        keyFingerprint: fallback.keyFingerprint
      });
      return fallback;
    } catch (fallbackError) {
      await recordUsage({
        capability: "text",
        context,
        provider: "fallback",
        success: false,
        latencyMs: Date.now() - fallbackStartedAt,
        errorCode: fallbackError instanceof Error ? fallbackError.message : "Fallback text generation failed"
      });
      throw primaryError instanceof Error ? primaryError : fallbackError;
    }
  }
}

export async function generateStructuredDataWithFallback<T>({
  prompt,
  systemPrompt,
  shape = "object",
  context
}: {
  prompt: string;
  systemPrompt?: string;
  shape?: "object" | "array";
  context?: AiRequestContext;
}): Promise<{ data: T; provider: string; model: string; repaired: boolean }> {
  const startedAt = Date.now();

  try {
    const primary = await generatePrimaryTextWithMetadata(prompt, systemPrompt);
    const parsed = normalizeStructuredOutput<T>(primary.text, shape);
    await recordUsage({
      capability: "structured",
      context,
      provider: primary.provider,
      model: primary.model,
      promptTokens: primary.usage.promptTokens,
      outputTokens: primary.usage.outputTokens,
      totalTokens: primary.usage.totalTokens,
      success: true,
      latencyMs: Date.now() - startedAt,
      keyFingerprint: primary.keyFingerprint
    });
    return {
      data: parsed,
      provider: primary.provider,
      model: primary.model,
      repaired: false
    };
  } catch (primaryError) {
    await recordUsage({
      capability: "structured",
      context,
      provider: "primary",
      success: false,
      latencyMs: Date.now() - startedAt,
      errorCode: primaryError instanceof Error ? primaryError.message : "Primary structured generation failed"
    });

    const fallbackStartedAt = Date.now();
    try {
      const fallback = await generateFallbackTextWithMetadata(prompt, systemPrompt);
      const parsed = normalizeStructuredOutput<T>(fallback.text, shape);
      await recordUsage({
        capability: "structured",
        context,
        provider: fallback.provider,
        model: fallback.model,
        promptTokens: fallback.usage.promptTokens,
        outputTokens: fallback.usage.outputTokens,
        totalTokens: fallback.usage.totalTokens,
        success: true,
        latencyMs: Date.now() - fallbackStartedAt,
        keyFingerprint: fallback.keyFingerprint
      });
      return {
        data: parsed,
        provider: fallback.provider,
        model: fallback.model,
        repaired: true
      };
    } catch (fallbackError) {
      await recordUsage({
        capability: "structured",
        context,
        provider: "fallback",
        success: false,
        latencyMs: Date.now() - fallbackStartedAt,
        errorCode: fallbackError instanceof Error ? fallbackError.message : "Fallback structured generation failed"
      });
      throw primaryError instanceof Error ? primaryError : fallbackError;
    }
  }
}

export async function generateTextWithFallback(prompt: string, systemPrompt?: string, context?: AiRequestContext) {
  try {
    const primary = await generateText(prompt, systemPrompt, context);
    return primary;
  } catch {
    const startedAt = Date.now();
    try {
      const fallback = await generateFallbackText(prompt, systemPrompt);
      await recordUsage({
        capability: "text",
        context,
        provider: "fallback",
        success: true,
        latencyMs: Date.now() - startedAt
      });
      return fallback;
    } catch (error) {
      await recordUsage({
        capability: "text",
        context,
        provider: "fallback",
        success: false,
        latencyMs: Date.now() - startedAt,
        errorCode: error instanceof Error ? error.message : "Fallback text generation failed"
      });
      throw error;
    }
  }
}

export async function generateMultimodalStructuredData<T>({
  parts,
  systemPrompt,
  context
}: {
  parts: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
  systemPrompt?: string;
  context?: AiRequestContext;
}): Promise<T> {
  const startedAt = Date.now();

  try {
    const response = await generatePrimaryMultimodalText({
      parts,
      systemPrompt
    });
    const parsed = parseJsonString(response.text) as T;
    await recordUsage({
      capability: "multimodal",
      context,
      provider: response.provider,
      model: response.model,
      promptTokens: response.usage.promptTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
      success: true,
      latencyMs: Date.now() - startedAt,
      keyFingerprint: response.keyFingerprint
    });
    return parsed;
  } catch (error) {
    await recordUsage({
      capability: "multimodal",
      context,
      provider: "primary",
      success: false,
      latencyMs: Date.now() - startedAt,
      errorCode: error instanceof Error ? error.message : "Primary multimodal generation failed"
    });
    throw error;
  }
}

export async function generateImageWithMetadata(prompt: string, systemPrompt?: string, context?: AiRequestContext) {
  const startedAt = Date.now();

  try {
    const response = await generatePrimaryImageWithMetadata(prompt, systemPrompt);
    await recordUsage({
      capability: "image",
      context,
      provider: response.provider,
      model: response.model,
      promptTokens: response.usage.promptTokens,
      outputTokens: response.usage.outputTokens,
      totalTokens: response.usage.totalTokens,
      imageCount: response.imageCount,
      success: true,
      latencyMs: Date.now() - startedAt,
      keyFingerprint: response.keyFingerprint
    });
    return response;
  } catch (error) {
    await recordUsage({
      capability: "image",
      context,
      provider: "primary",
      success: false,
      latencyMs: Date.now() - startedAt,
      errorCode: error instanceof Error ? error.message : "Primary image generation failed",
      imageCount: 1
    });
    throw error;
  }
}

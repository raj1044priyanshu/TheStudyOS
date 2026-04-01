import { parseJsonArray, parseJsonString } from "@/lib/api";
import {
  generatePrimaryImageWithMetadata,
  generatePrimaryMultimodalText,
  generatePrimaryText,
  generatePrimaryTextWithMetadata
} from "@/lib/content-provider-primary";
import { generateFallbackText, generateFallbackTextWithMetadata } from "@/lib/content-provider-fallback";

function normalizeStructuredOutput<T>(raw: string, shape: "object" | "array"): T {
  return (shape === "object" ? parseJsonString(raw) : parseJsonArray(raw)) as T;
}

export async function generateText(prompt: string, systemPrompt?: string) {
  return generatePrimaryText(prompt, systemPrompt);
}

export async function generateTextWithMetadata(prompt: string, systemPrompt?: string) {
  try {
    return await generatePrimaryTextWithMetadata(prompt, systemPrompt);
  } catch {
    return generateFallbackTextWithMetadata(prompt, systemPrompt);
  }
}

export async function generateStructuredDataWithFallback<T>({
  prompt,
  systemPrompt,
  shape = "object"
}: {
  prompt: string;
  systemPrompt?: string;
  shape?: "object" | "array";
}): Promise<{ data: T; provider: string; model: string; repaired: boolean }> {
  try {
    const primary = await generatePrimaryTextWithMetadata(prompt, systemPrompt);
    return {
      data: normalizeStructuredOutput<T>(primary.text, shape),
      provider: primary.provider,
      model: primary.model,
      repaired: false
    };
  } catch (primaryError) {
    const fallback = await generateFallbackTextWithMetadata(prompt, systemPrompt).catch((fallbackError) => {
      throw primaryError instanceof Error ? primaryError : fallbackError;
    });

    return {
      data: normalizeStructuredOutput<T>(fallback.text, shape),
      provider: fallback.provider,
      model: fallback.model,
      repaired: true
    };
  }
}

export async function generateTextWithFallback(prompt: string, systemPrompt?: string) {
  try {
    return await generatePrimaryText(prompt, systemPrompt);
  } catch {
    return generateFallbackText(prompt, systemPrompt);
  }
}

export async function generateMultimodalStructuredData<T>({
  parts,
  systemPrompt
}: {
  parts: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
  systemPrompt?: string;
}): Promise<T> {
  const text = await generatePrimaryMultimodalText({
    parts,
    systemPrompt
  });

  return parseJsonString(text) as T;
}

export const generateImageWithMetadata = generatePrimaryImageWithMetadata;

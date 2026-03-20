import { GoogleGenAI } from "@google/genai";
import { generateContent, generateContentWithMetadata } from "@/lib/gemini";
import { generateGroqContent, generateGroqContentWithMetadata } from "@/lib/groq";
import { parseJsonArray, parseJsonString } from "@/lib/api";

const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

function normalizeModelJson<T>(raw: string, shape: "object" | "array"): T {
  return (shape === "object" ? parseJsonString(raw) : parseJsonArray(raw)) as T;
}

export async function generateJsonWithFallback<T>({
  prompt,
  systemPrompt,
  shape = "object"
}: {
  prompt: string;
  systemPrompt?: string;
  shape?: "object" | "array";
}): Promise<{ data: T; provider: string; model: string; repaired: boolean }> {
  try {
    const primary = await generateContentWithMetadata(prompt, systemPrompt);
    return {
      data: normalizeModelJson<T>(primary.text, shape),
      provider: primary.provider,
      model: primary.model,
      repaired: false
    };
  } catch (primaryError) {
    const fallback = await generateGroqContentWithMetadata(prompt, systemPrompt).catch((groqError) => {
      throw primaryError instanceof Error ? primaryError : groqError;
    });
    return {
      data: normalizeModelJson<T>(fallback.text, shape),
      provider: fallback.provider,
      model: fallback.model,
      repaired: true
    };
  }
}

export async function generatePlainTextWithFallback(prompt: string, systemPrompt?: string) {
  try {
    return await generateContent(prompt, systemPrompt);
  } catch {
    return generateGroqContent(prompt, systemPrompt);
  }
}

export async function generateGeminiMultimodalJson<T>({
  parts,
  systemPrompt
}: {
  parts: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mimeType: string }
  >;
  systemPrompt?: string;
}): Promise<T> {
  if (!geminiClient) {
    throw new Error("Gemini client unavailable");
  }

  const result = await geminiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: parts.map((part) =>
          part.type === "text"
            ? { text: part.text }
            : {
                inlineData: {
                  mimeType: part.mimeType,
                  data: part.data
                }
              }
        )
      }
    ],
    config: systemPrompt
      ? {
          systemInstruction: systemPrompt
        }
      : undefined
  });

  const text =
    result.text?.trim() ||
    result.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => ("text" in part ? part.text?.trim() : ""))
      .filter(Boolean)
      .join("\n") ||
    "";

  return parseJsonString(text) as T;
}

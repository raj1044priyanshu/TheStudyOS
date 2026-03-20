import { GoogleGenAI } from "@google/genai";
import { generateGroqContentWithMetadata, type GeneratedContentResult } from "@/lib/groq";

const geminiClient = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const geminiTextCandidates = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
const geminiImageCandidates = ["gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"];

interface GeminiTextResponse {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
}

export interface GeneratedImageResult {
  data: string;
  mimeType: string;
  provider: "gemini";
  model: string;
  captions: string[];
}

function extractGeminiText(response: GeminiTextResponse) {
  if (typeof response.text === "string" && response.text.trim().length > 0) {
    return response.text.trim();
  }

  return (
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim())
      .filter((text): text is string => Boolean(text)) ?? []
  ).join("\n");
}

export async function generateContent(prompt: string, systemPrompt?: string): Promise<string> {
  const result = await generateContentWithMetadata(prompt, systemPrompt);
  return result.text;
}

export async function generateContentWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedContentResult> {
  const geminiErrors: string[] = [];

  if (geminiClient) {
    for (const modelName of geminiTextCandidates) {
      try {
        const result = (await geminiClient.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
            temperature: 0.35
          }
        })) as GeminiTextResponse;
        const text = extractGeminiText(result);
        if (text.trim().length > 0) {
          return {
            text,
            provider: "gemini",
            model: modelName
          };
        }
      } catch (error) {
        geminiErrors.push(`${modelName}: ${error instanceof Error ? error.message : "Unknown Gemini error"}`);
      }
    }
  } else {
    geminiErrors.push("Gemini client unavailable");
  }

  try {
    return await generateGroqContentWithMetadata(prompt, systemPrompt);
  } catch (error) {
    const groqMessage = error instanceof Error ? error.message : "Unknown Groq error";
    throw new Error(`Content providers failed. Gemini attempts -> ${geminiErrors.join(" | ")}. Groq -> ${groqMessage}`);
  }
}

export async function generateImageWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedImageResult> {
  if (!geminiClient) {
    throw new Error("Gemini image generation is unavailable because GEMINI_API_KEY is missing.");
  }

  const geminiErrors: string[] = [];

  for (const modelName of geminiImageCandidates) {
    try {
      const result = (await geminiClient.models.generateContent({
        model: modelName,
        contents: prompt,
        config: systemPrompt
          ? {
              systemInstruction: systemPrompt
            }
          : undefined
      })) as GeminiImageResponse;

      const parts = result.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
      const imagePart = parts.find((part) => part.inlineData?.data && part.inlineData?.mimeType?.startsWith("image/"));
      if (imagePart?.inlineData?.data && imagePart.inlineData.mimeType) {
        return {
          data: imagePart.inlineData.data,
          mimeType: imagePart.inlineData.mimeType,
          provider: "gemini",
          model: modelName,
          captions: parts.map((part) => part.text?.trim()).filter((text): text is string => Boolean(text))
        };
      }
      geminiErrors.push(`${modelName}: no image data returned`);
    } catch (error) {
      geminiErrors.push(`${modelName}: ${error instanceof Error ? error.message : "Unknown Gemini error"}`);
    }
  }

  throw new Error(`Gemini image generation failed. Attempts -> ${geminiErrors.join(" | ")}`);
}

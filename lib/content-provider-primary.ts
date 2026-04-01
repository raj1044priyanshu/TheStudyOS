interface ProviderPart {
  text?: string;
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  inline_data?: {
    mime_type?: string;
    data?: string;
  };
}

interface PrimaryContentResponse {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: ProviderPart[];
    };
  }>;
}

export interface GeneratedTextResult {
  text: string;
  provider: "primary";
  model: string;
}

export interface GeneratedImageResult {
  data: string;
  mimeType: string;
  provider: "primary";
  model: string;
  captions: string[];
}

type MultimodalInputPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

const PRIMARY_API_BASE = (process.env.CONTENT_PRIMARY_API_BASE || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
const PRIMARY_TEXT_MODELS = [process.env.CONTENT_PRIMARY_TEXT_MODEL || "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
const PRIMARY_MULTIMODAL_MODEL = process.env.CONTENT_PRIMARY_MULTIMODAL_MODEL || process.env.CONTENT_PRIMARY_TEXT_MODEL || "gemini-2.5-flash";
const PRIMARY_IMAGE_MODELS = [process.env.CONTENT_PRIMARY_IMAGE_MODEL || "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"];

function getPrimaryApiKey() {
  if (!process.env.CONTENT_PRIMARY_API_KEY) {
    throw new Error("CONTENT_PRIMARY_API_KEY is missing");
  }

  return process.env.CONTENT_PRIMARY_API_KEY;
}

function buildPrimaryUrl(model: string) {
  return `${PRIMARY_API_BASE}/models/${encodeURIComponent(model)}:generateContent`;
}

async function requestPrimaryContent({
  model,
  systemPrompt,
  parts,
  temperature
}: {
  model: string;
  systemPrompt?: string;
  parts: MultimodalInputPart[];
  temperature?: number;
}) {
  const response = await fetch(buildPrimaryUrl(model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": getPrimaryApiKey()
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: parts.map((part) =>
            part.type === "text"
              ? { text: part.text }
              : {
                  inline_data: {
                    mime_type: part.mimeType,
                    data: part.data
                  }
                }
          )
        }
      ],
      ...(systemPrompt
        ? {
            system_instruction: {
              parts: [{ text: systemPrompt }]
            }
          }
        : {}),
      ...(typeof temperature === "number"
        ? {
            generationConfig: {
              temperature
            }
          }
        : {})
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Primary provider request failed for ${model}`);
  }

  return (await response.json()) as PrimaryContentResponse;
}

function extractText(response: PrimaryContentResponse) {
  if (typeof response.text === "string" && response.text.trim()) {
    return response.text.trim();
  }

  return (
    response.candidates
      ?.flatMap((candidate) => candidate.content?.parts ?? [])
      .map((part) => part.text?.trim())
      .filter((value): value is string => Boolean(value)) ?? []
  ).join("\n");
}

function extractInlineImage(part: ProviderPart) {
  if (part.inlineData?.data && part.inlineData.mimeType?.startsWith("image/")) {
    return {
      data: part.inlineData.data,
      mimeType: part.inlineData.mimeType
    };
  }

  if (part.inline_data?.data && part.inline_data.mime_type?.startsWith("image/")) {
    return {
      data: part.inline_data.data,
      mimeType: part.inline_data.mime_type
    };
  }

  return null;
}

export async function generatePrimaryTextWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedTextResult> {
  const errors: string[] = [];

  for (const model of PRIMARY_TEXT_MODELS) {
    try {
      const response = await requestPrimaryContent({
        model,
        systemPrompt,
        parts: [{ type: "text", text: prompt }],
        temperature: 0.35
      });
      const text = extractText(response);
      if (text) {
        return {
          text,
          provider: "primary",
          model
        };
      }
      errors.push(`${model}: empty response`);
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : "Unknown primary provider error"}`);
    }
  }

  throw new Error(`Primary provider failed. Attempts -> ${errors.join(" | ")}`);
}

export async function generatePrimaryText(prompt: string, systemPrompt?: string) {
  const result = await generatePrimaryTextWithMetadata(prompt, systemPrompt);
  return result.text;
}

export async function generatePrimaryMultimodalText({
  parts,
  systemPrompt
}: {
  parts: MultimodalInputPart[];
  systemPrompt?: string;
}) {
  const response = await requestPrimaryContent({
    model: PRIMARY_MULTIMODAL_MODEL,
    systemPrompt,
    parts
  });

  const text = extractText(response);
  if (!text) {
    throw new Error("Primary multimodal response was empty");
  }

  return text;
}

export async function generatePrimaryImageWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedImageResult> {
  const errors: string[] = [];

  for (const model of PRIMARY_IMAGE_MODELS) {
    try {
      const response = await requestPrimaryContent({
        model,
        systemPrompt,
        parts: [{ type: "text", text: prompt }]
      });

      const parts = response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
      const image = parts.map(extractInlineImage).find(Boolean);
      if (image) {
        return {
          data: image.data,
          mimeType: image.mimeType,
          provider: "primary",
          model,
          captions: parts.map((part) => part.text?.trim()).filter((value): value is string => Boolean(value))
        };
      }

      errors.push(`${model}: no image data returned`);
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : "Unknown image generation error"}`);
    }
  }

  throw new Error(`Primary image generation failed. Attempts -> ${errors.join(" | ")}`);
}

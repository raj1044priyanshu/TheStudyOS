import { isImagenModel, resolveAiProviderConfig } from "@/lib/ai-provider-config";

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

interface PrimaryUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

interface PrimaryContentResponse {
  text?: string;
  candidates?: Array<{
    content?: {
      parts?: ProviderPart[];
    };
  }>;
  usageMetadata?: PrimaryUsageMetadata;
}

interface ImagenResponse {
  data?: Array<{
    b64_json?: string;
  }>;
}

interface UsageSummary {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GeneratedTextResult {
  text: string;
  provider: "primary";
  model: string;
  keyFingerprint: string;
  usage: UsageSummary;
}

export interface GeneratedImageResult {
  data: string;
  mimeType: string;
  provider: "google";
  model: string;
  captions: string[];
  keyFingerprint: string;
  imageCount: number;
  usage: UsageSummary;
}

type MultimodalInputPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mimeType: string };

function uniqueModels(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const models: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    models.push(normalized);
  }

  return models;
}

async function getPrimaryConfig() {
  const config = await resolveAiProviderConfig("primary");
  if (!config.apiKey) {
    throw new Error("CONTENT_PRIMARY_API_KEY is missing");
  }

  return config;
}

function buildPrimaryUrl(apiBase: string, model: string) {
  return `${apiBase}/models/${encodeURIComponent(model)}:generateContent`;
}

function buildImagenUrl(apiBase: string) {
  const normalized = apiBase.endsWith("/v1beta") ? apiBase : `${apiBase.replace(/\/$/, "")}/v1beta`;
  return `${normalized}/openai/images/generations`;
}

function toUsageSummary(input?: PrimaryUsageMetadata): UsageSummary {
  return {
    promptTokens: input?.promptTokenCount ?? 0,
    outputTokens: input?.candidatesTokenCount ?? 0,
    totalTokens: input?.totalTokenCount ?? 0
  };
}

async function requestPrimaryContent({
  apiBase,
  apiKey,
  model,
  systemPrompt,
  parts,
  temperature,
  responseModalities
}: {
  apiBase: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  parts: MultimodalInputPart[];
  temperature?: number;
  responseModalities?: string[];
}) {
  const response = await fetch(buildPrimaryUrl(apiBase, model), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
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
      ...((typeof temperature === "number" || responseModalities?.length)
        ? {
            generationConfig: {
              ...(typeof temperature === "number" ? { temperature } : {}),
              ...(responseModalities?.length ? { responseModalities } : {})
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

async function requestImagenContent({
  apiBase,
  apiKey,
  model,
  prompt
}: {
  apiBase: string;
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const response = await fetch(buildImagenUrl(apiBase), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Imagen request failed for ${model}`);
  }

  return (await response.json()) as ImagenResponse;
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
  const config = await getPrimaryConfig();
  const errors: string[] = [];
  const models = uniqueModels([config.textModel, "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]);

  for (const model of models) {
    try {
      const response = await requestPrimaryContent({
        apiBase: config.apiBase,
        apiKey: config.apiKey,
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
          model,
          keyFingerprint: config.keyFingerprint,
          usage: toUsageSummary(response.usageMetadata)
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
  const config = await getPrimaryConfig();
  const model = config.multimodalModel || config.textModel;
  const response = await requestPrimaryContent({
    apiBase: config.apiBase,
    apiKey: config.apiKey,
    model,
    systemPrompt,
    parts
  });

  const text = extractText(response);
  if (!text) {
    throw new Error("Primary multimodal response was empty");
  }

  return {
    text,
    provider: "primary" as const,
    model,
    keyFingerprint: config.keyFingerprint,
    usage: toUsageSummary(response.usageMetadata)
  };
}

export async function generatePrimaryImageWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedImageResult> {
  const config = await getPrimaryConfig();
  const errors: string[] = [];
  const models = uniqueModels([config.imageModel, "gemini-2.5-flash-image"]);

  for (const model of models) {
    try {
      if (isImagenModel(model)) {
        const response = await requestImagenContent({
          apiBase: config.apiBase,
          apiKey: config.apiKey,
          model,
          prompt: [systemPrompt, prompt].filter(Boolean).join("\n\n")
        });

        const imageData = response.data?.[0]?.b64_json ?? "";
        if (imageData) {
          return {
            data: imageData,
            mimeType: "image/png",
            provider: "google",
            model,
            captions: [],
            keyFingerprint: config.keyFingerprint,
            imageCount: 1,
            usage: {
              promptTokens: 0,
              outputTokens: 0,
              totalTokens: 0
            }
          };
        }

        errors.push(`${model}: no image data returned`);
        continue;
      }

      const response = await requestPrimaryContent({
        apiBase: config.apiBase,
        apiKey: config.apiKey,
        model,
        systemPrompt,
        parts: [{ type: "text", text: prompt }],
        responseModalities: ["TEXT", "IMAGE"]
      });

      const parts = response.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ?? [];
      const image = parts.map(extractInlineImage).find(Boolean);
      if (image) {
        return {
          data: image.data,
          mimeType: image.mimeType,
          provider: "google",
          model,
          captions: parts.map((part) => part.text?.trim()).filter((value): value is string => Boolean(value)),
          keyFingerprint: config.keyFingerprint,
          imageCount: 1,
          usage: toUsageSummary(response.usageMetadata)
        };
      }

      errors.push(`${model}: no image data returned`);
    } catch (error) {
      errors.push(`${model}: ${error instanceof Error ? error.message : "Unknown image generation error"}`);
    }
  }

  throw new Error(`Primary image generation failed. Attempts -> ${errors.join(" | ")}`);
}

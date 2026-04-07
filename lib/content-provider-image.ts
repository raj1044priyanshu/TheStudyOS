import { generatePrimaryImageWithMetadata } from "@/lib/content-provider-primary";
import { resolveAiProviderConfig } from "@/lib/ai-provider-config";

interface NvidiaImageArtifact {
  base64?: string;
  b64_json?: string;
  mime_type?: string;
  mimeType?: string;
}

interface NvidiaImageResponse {
  image?: string;
  data?: NvidiaImageArtifact[];
  artifacts?: NvidiaImageArtifact[];
}

interface UsageSummary {
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GeneratedImageResult {
  data: string;
  mimeType: string;
  provider: "nvidia" | "google";
  model: string;
  captions: string[];
  keyFingerprint: string;
  imageCount: number;
  usage: UsageSummary;
}

function buildNvidiaImageUrl(apiBase: string, model: string) {
  const normalizedBase = apiBase.replace(/\/$/, "");
  const normalizedModel = model
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBase}/${normalizedModel}`;
}

function stripDataUrlPrefix(value: string) {
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    data: match[2]
  };
}

function extractNvidiaImage(payload: NvidiaImageResponse) {
  if (typeof payload.image === "string") {
    const fromDataUrl = stripDataUrlPrefix(payload.image);
    if (fromDataUrl) {
      return fromDataUrl;
    }

    return {
      data: payload.image,
      mimeType: "image/png"
    };
  }

  const artifact = [...(payload.artifacts ?? []), ...(payload.data ?? [])].find((item) => item.base64 || item.b64_json);
  if (!artifact) {
    return null;
  }

  return {
    data: artifact.base64 || artifact.b64_json || "",
    mimeType: artifact.mime_type || artifact.mimeType || "image/png"
  };
}

export async function hasGoogleImageFallback() {
  const config = await resolveAiProviderConfig("primary");
  return Boolean(config.enabled && config.apiKey.trim());
}

export async function generateGoogleImageFallbackWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedImageResult> {
  const response = await generatePrimaryImageWithMetadata(prompt, systemPrompt);

  return {
    ...response,
    provider: "google"
  };
}

export async function generateDedicatedImageWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedImageResult> {
  const config = await resolveAiProviderConfig("image");

  if (!config.enabled) {
    throw new Error("The dedicated image provider is disabled.");
  }

  if (config.provider === "google") {
    return generateGoogleImageFallbackWithMetadata(prompt, systemPrompt);
  }

  if (!config.apiKey) {
    throw new Error("NVIDIA_API_KEY is missing");
  }

  const response = await fetch(buildNvidiaImageUrl(config.apiBase, config.imageModel), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      Accept: "application/json"
    },
    body: JSON.stringify({
      prompt: [systemPrompt, prompt].filter(Boolean).join("\n\n"),
      samples: 1,
      steps: 4,
      seed: 0,
      width: 1024,
      height: 1024
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `NVIDIA image generation failed for ${config.imageModel}`);
  }

  const payload = (await response.json()) as NvidiaImageResponse;
  const image = extractNvidiaImage(payload);
  if (!image?.data) {
    throw new Error("NVIDIA image generation returned no image data.");
  }

  return {
    data: image.data,
    mimeType: image.mimeType,
    provider: "nvidia",
    model: config.imageModel,
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

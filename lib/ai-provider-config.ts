import { connectToDatabase } from "@/lib/mongodb";
import { createApiKeyFingerprint, decryptApiKey, encryptApiKey, hasAiEncryptionSecret } from "@/lib/ai-secrets";
import { AiProviderConfigModel } from "@/models/AiProviderConfig";

export type AiProviderKey = "primary" | "fallback" | "image";
export type AiProviderKind = "google" | "groq" | "nvidia";
export type AiValidationStatus = "unknown" | "valid" | "warning" | "invalid";

export interface ResolvedAiProviderConfig {
  key: AiProviderKey;
  provider: AiProviderKind;
  source: "database" | "env";
  enabled: boolean;
  apiBase: string;
  apiKey: string;
  keyFingerprint: string;
  textModel: string;
  multimodalModel: string;
  imageModel: string;
  lastValidatedAt: string | null;
  lastValidationStatus: AiValidationStatus;
  lastValidationMessage: string;
}

interface EnvConfigShape {
  key: AiProviderKey;
  provider: AiProviderKind;
  apiBase: string;
  apiKey: string;
  textModel: string;
  multimodalModel: string;
  imageModel: string;
}

export interface AiConfigPatchInput {
  enabled?: boolean;
  apiBase?: string;
  apiKey?: string;
  resetToEnv?: boolean;
  textModel?: string;
  multimodalModel?: string;
  imageModel?: string;
}

const PRIMARY_DEFAULT_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const FALLBACK_DEFAULT_API_BASE = "https://api.groq.com/openai/v1";
const IMAGE_DEFAULT_API_BASE = "https://ai.api.nvidia.com/v1/genai";

function getProviderKind(key: AiProviderKey): AiProviderKind {
  if (key === "primary") {
    return "google";
  }

  if (key === "fallback") {
    return "groq";
  }

  return "nvidia";
}

function buildNvidiaImageUrl(apiBase: string, model: string) {
  const normalizedBase = apiBase.replace(/\/$/, "");
  const normalizedModel = model
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${normalizedBase}/${normalizedModel}`;
}

function getEnvConfig(key: AiProviderKey): EnvConfigShape {
  if (key === "primary") {
    return {
      key,
      provider: "google",
      apiBase: (process.env.CONTENT_PRIMARY_API_BASE || PRIMARY_DEFAULT_API_BASE).replace(/\/$/, ""),
      apiKey: process.env.CONTENT_PRIMARY_API_KEY?.trim() || "",
      textModel: process.env.CONTENT_PRIMARY_TEXT_MODEL || "gemini-2.5-flash",
      multimodalModel: process.env.CONTENT_PRIMARY_MULTIMODAL_MODEL || process.env.CONTENT_PRIMARY_TEXT_MODEL || "gemini-2.5-flash",
      imageModel: process.env.CONTENT_PRIMARY_IMAGE_MODEL || "gemini-2.5-flash-image"
    };
  }

  if (key === "fallback") {
    return {
      key,
      provider: "groq",
      apiBase: (process.env.CONTENT_FALLBACK_API_BASE || FALLBACK_DEFAULT_API_BASE).replace(/\/$/, ""),
      apiKey: process.env.CONTENT_FALLBACK_API_KEY?.trim() || "",
      textModel: process.env.CONTENT_FALLBACK_TEXT_MODEL || "llama-3.1-8b-instant",
      multimodalModel: "",
      imageModel: ""
    };
  }

  return {
    key,
    provider: "nvidia",
    apiBase: (process.env.NVIDIA_API_BASE || IMAGE_DEFAULT_API_BASE).replace(/\/$/, ""),
    apiKey: process.env.NVIDIA_API_KEY?.trim() || "",
    textModel: "",
    multimodalModel: "",
    imageModel: process.env.NVIDIA_IMAGE_MODEL || "black-forest-labs/flux.1-schnell"
  };
}

function normalizeModelValue(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function normalizeImageModel(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function buildConfigDocumentPayload(
  key: AiProviderKey,
  provider: AiProviderKind,
  input: AiConfigPatchInput,
  existing: {
    enabled?: boolean;
    apiBase?: string;
    apiKeyCiphertext?: string;
    apiKeyIv?: string;
    apiKeyTag?: string;
    keyFingerprint?: string;
    textModel?: string;
    multimodalModel?: string;
    imageModel?: string;
  } | null,
  envConfig: EnvConfigShape,
  userId: string,
  validation: { status: AiValidationStatus; message: string }
) {
  const payload: Record<string, unknown> = {
    key,
    provider,
    enabled: input.enabled ?? existing?.enabled ?? true,
    apiBase: input.apiBase?.trim() ?? existing?.apiBase ?? envConfig.apiBase,
    textModel: normalizeModelValue(input.textModel, existing?.textModel || envConfig.textModel),
    multimodalModel: normalizeModelValue(input.multimodalModel, existing?.multimodalModel || envConfig.multimodalModel),
    imageModel: normalizeImageModel(input.imageModel, existing?.imageModel || envConfig.imageModel),
    updatedByUserId: userId,
    lastValidatedAt: new Date(),
    lastValidationStatus: validation.status,
    lastValidationMessage: validation.message
  };

  if (input.resetToEnv) {
    payload.apiKeyCiphertext = "";
    payload.apiKeyIv = "";
    payload.apiKeyTag = "";
    payload.keyFingerprint = envConfig.apiKey ? createApiKeyFingerprint(envConfig.apiKey) : "";
    return payload;
  }

  if (typeof input.apiKey === "string" && input.apiKey.trim()) {
    const encrypted = encryptApiKey(input.apiKey.trim());
    payload.apiKeyCiphertext = encrypted.ciphertext;
    payload.apiKeyIv = encrypted.iv;
    payload.apiKeyTag = encrypted.tag;
    payload.keyFingerprint = createApiKeyFingerprint(input.apiKey.trim());
    return payload;
  }

  payload.apiKeyCiphertext = existing?.apiKeyCiphertext ?? "";
  payload.apiKeyIv = existing?.apiKeyIv ?? "";
  payload.apiKeyTag = existing?.apiKeyTag ?? "";
  payload.keyFingerprint = existing?.keyFingerprint ?? (envConfig.apiKey ? createApiKeyFingerprint(envConfig.apiKey) : "");
  return payload;
}

export function isImagenModel(model: string) {
  return model.trim().toLowerCase().startsWith("imagen-");
}

export async function resolveAiProviderConfig(key: AiProviderKey): Promise<ResolvedAiProviderConfig> {
  const envConfig = getEnvConfig(key);

  try {
    await connectToDatabase();
    const stored = await AiProviderConfigModel.findOne({ key }).lean();

    if (stored?.enabled === false) {
      return {
        key,
        provider: stored.provider as AiProviderKind,
        source: "database",
        enabled: false,
        apiBase: (stored.apiBase || envConfig.apiBase).replace(/\/$/, ""),
        apiKey: "",
        keyFingerprint: stored.keyFingerprint || "",
        textModel: stored.textModel || envConfig.textModel,
        multimodalModel: stored.multimodalModel || envConfig.multimodalModel,
        imageModel: stored.imageModel || envConfig.imageModel,
        lastValidatedAt: stored.lastValidatedAt ? new Date(stored.lastValidatedAt).toISOString() : null,
        lastValidationStatus: (stored.lastValidationStatus || "unknown") as AiValidationStatus,
        lastValidationMessage: stored.lastValidationMessage || ""
      };
    }

    if (
      stored &&
      stored.apiKeyCiphertext &&
      stored.apiKeyIv &&
      stored.apiKeyTag &&
      hasAiEncryptionSecret()
    ) {
      const apiKey = decryptApiKey({
        ciphertext: stored.apiKeyCiphertext,
        iv: stored.apiKeyIv,
        tag: stored.apiKeyTag
      });

      return {
        key,
        provider: stored.provider as AiProviderKind,
        source: "database",
        enabled: stored.enabled !== false,
        apiBase: (stored.apiBase || envConfig.apiBase).replace(/\/$/, ""),
        apiKey,
        keyFingerprint: stored.keyFingerprint || createApiKeyFingerprint(apiKey),
        textModel: stored.textModel || envConfig.textModel,
        multimodalModel: stored.multimodalModel || envConfig.multimodalModel,
        imageModel: stored.imageModel || envConfig.imageModel,
        lastValidatedAt: stored.lastValidatedAt ? new Date(stored.lastValidatedAt).toISOString() : null,
        lastValidationStatus: (stored.lastValidationStatus || "unknown") as AiValidationStatus,
        lastValidationMessage: stored.lastValidationMessage || ""
      };
    }
  } catch (error) {
    console.error("Failed to resolve stored AI provider config, falling back to env", { key, error });
  }

  return {
    key,
    provider: envConfig.provider,
    source: "env",
    enabled: true,
    apiBase: envConfig.apiBase,
    apiKey: envConfig.apiKey,
    keyFingerprint: envConfig.apiKey ? createApiKeyFingerprint(envConfig.apiKey) : "",
    textModel: envConfig.textModel,
    multimodalModel: envConfig.multimodalModel,
    imageModel: envConfig.imageModel,
    lastValidatedAt: null,
    lastValidationStatus: envConfig.apiKey ? "unknown" : "invalid",
    lastValidationMessage: envConfig.apiKey ? "" : "No API key is configured for this provider."
  };
}

export async function getAiConfigOverview() {
  const [primary, fallback, image] = await Promise.all([
    resolveAiProviderConfig("primary"),
    resolveAiProviderConfig("fallback"),
    resolveAiProviderConfig("image")
  ]);

  return {
    encryptionReady: hasAiEncryptionSecret(),
    primary: {
      ...primary,
      apiKeyPresent: Boolean(primary.apiKey),
      apiKey: undefined
    },
    fallback: {
      ...fallback,
      apiKeyPresent: Boolean(fallback.apiKey),
      apiKey: undefined
    },
    image: {
      ...image,
      apiKeyPresent: Boolean(image.apiKey),
      apiKey: undefined
    }
  };
}

export async function validateAiProviderPatch(key: AiProviderKey, patch: AiConfigPatchInput, existingApiKey?: string) {
  const envConfig = getEnvConfig(key);
  const provider = getProviderKind(key);
  const apiBase = (patch.apiBase?.trim() || envConfig.apiBase).replace(/\/$/, "");
  const apiKey = patch.resetToEnv ? envConfig.apiKey : patch.apiKey?.trim() || existingApiKey || envConfig.apiKey;

  if (!apiKey) {
    return {
      status: "invalid" as const,
      message: "No API key is configured."
    };
  }

  try {
    if (provider === "google") {
      const textModel = normalizeModelValue(patch.textModel, envConfig.textModel);
      const imageModel = normalizeImageModel(patch.imageModel, envConfig.imageModel);
      const modelChecks = [textModel, imageModel].filter(Boolean);

      for (const modelName of modelChecks) {
        const response = await fetch(`${apiBase}/models/${encodeURIComponent(modelName)}`, {
          headers: {
            "x-goog-api-key": apiKey
          },
          cache: "no-store"
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return {
            status: "invalid" as const,
            message: detail || `Model validation failed for ${modelName}.`
          };
        }
      }

      if (!/image|imagen/i.test(imageModel)) {
        return {
          status: "warning" as const,
          message: "The configured image model does not look like an image-capable Gemini or Imagen model."
        };
      }

      return {
        status: "valid" as const,
        message: isImagenModel(imageModel)
          ? "Google config validated. Imagen models will use the dedicated image endpoint."
          : "Google config validated successfully."
      };
    }

    if (provider === "nvidia") {
      const imageModel = normalizeImageModel(patch.imageModel, envConfig.imageModel);
      const response = await fetch(buildNvidiaImageUrl(apiBase, imageModel), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        },
        body: JSON.stringify({
          prompt: "StudyOS configuration validation image.",
          samples: 1,
          steps: 1,
          seed: 0,
          width: 1024,
          height: 1024
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        return {
          status: "invalid" as const,
          message: detail || `NVIDIA image validation failed for ${imageModel}.`
        };
      }

      return {
        status: "valid" as const,
        message: "NVIDIA image config validated successfully with a low-step trial request."
      };
    }

    const response = await fetch(`${apiBase}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return {
        status: "invalid" as const,
        message: detail || "Fallback provider validation failed."
      };
    }

    return {
      status: "valid" as const,
      message: "Fallback provider validated successfully."
    };
  } catch (error) {
    return {
      status: "warning" as const,
      message: error instanceof Error ? error.message : "Provider validation could not complete."
    };
  }
}

export async function upsertAiProviderConfig(key: AiProviderKey, input: AiConfigPatchInput, userId: string) {
  await connectToDatabase();

  const envConfig = getEnvConfig(key);
  const existing = await AiProviderConfigModel.findOne({ key });
  const existingApiKey =
    existing?.apiKeyCiphertext && existing?.apiKeyIv && existing?.apiKeyTag && hasAiEncryptionSecret()
      ? decryptApiKey({
          ciphertext: existing.apiKeyCiphertext,
          iv: existing.apiKeyIv,
          tag: existing.apiKeyTag
        })
      : "";

  const validation = await validateAiProviderPatch(key, input, existingApiKey);
  const payload = buildConfigDocumentPayload(
    key,
    getProviderKind(key),
    input,
    existing,
    envConfig,
    userId,
    validation
  );

  const record = await AiProviderConfigModel.findOneAndUpdate({ key }, payload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });

  return {
    record,
    validation
  };
}

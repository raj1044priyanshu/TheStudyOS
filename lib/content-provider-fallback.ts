import { resolveAiProviderConfig } from "@/lib/ai-provider-config";

interface FallbackUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface GeneratedTextResult {
  text: string;
  provider: "fallback";
  model: string;
  keyFingerprint: string;
  usage: {
    promptTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

async function getFallbackConfig() {
  const config = await resolveAiProviderConfig("fallback");
  if (!config.apiKey) {
    throw new Error("CONTENT_FALLBACK_API_KEY is missing");
  }

  return config;
}

export async function generateFallbackTextWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedTextResult> {
  const config = await getFallbackConfig();
  const response = await fetch(`${config.apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.textModel,
      temperature: 0.4,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || "Fallback provider request failed");
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
      };
    }>;
    usage?: FallbackUsage;
  };

  return {
    text: payload.choices?.[0]?.message?.content ?? "",
    provider: "fallback",
    model: config.textModel,
    keyFingerprint: config.keyFingerprint,
    usage: {
      promptTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
      totalTokens: payload.usage?.total_tokens ?? 0
    }
  };
}

export async function generateFallbackText(prompt: string, systemPrompt?: string) {
  const result = await generateFallbackTextWithMetadata(prompt, systemPrompt);
  return result.text;
}

export interface GeneratedTextResult {
  text: string;
  provider: "fallback";
  model: string;
}

const FALLBACK_API_BASE = (process.env.CONTENT_FALLBACK_API_BASE || "https://api.groq.com/openai/v1").replace(/\/$/, "");
const FALLBACK_TEXT_MODEL = process.env.CONTENT_FALLBACK_TEXT_MODEL || "llama-3.1-8b-instant";

function getFallbackApiKey() {
  if (!process.env.CONTENT_FALLBACK_API_KEY) {
    throw new Error("CONTENT_FALLBACK_API_KEY is missing");
  }

  return process.env.CONTENT_FALLBACK_API_KEY;
}

export async function generateFallbackTextWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedTextResult> {
  const response = await fetch(`${FALLBACK_API_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getFallbackApiKey()}`
    },
    body: JSON.stringify({
      model: FALLBACK_TEXT_MODEL,
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
  };

  return {
    text: payload.choices?.[0]?.message?.content ?? "",
    provider: "fallback",
    model: FALLBACK_TEXT_MODEL
  };
}

export async function generateFallbackText(prompt: string, systemPrompt?: string) {
  const result = await generateFallbackTextWithMetadata(prompt, systemPrompt);
  return result.text;
}

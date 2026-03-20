import Groq from "groq-sdk";

let groqClient: Groq | null = null;

export interface GeneratedContentResult {
  text: string;
  provider: "gemini" | "groq";
  model: string;
}

function getGroqClient() {
  if (groqClient) {
    return groqClient;
  }
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }
  groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groqClient;
}

export async function generateGroqContentWithMetadata(prompt: string, systemPrompt?: string): Promise<GeneratedContentResult> {
  const model = "llama-3.1-8b-instant";
  const completion = await getGroqClient().chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      { role: "user" as const, content: prompt }
    ]
  });

  return {
    text: completion.choices[0]?.message?.content ?? "",
    provider: "groq",
    model
  };
}

export async function generateGroqContent(prompt: string, systemPrompt?: string) {
  const result = await generateGroqContentWithMetadata(prompt, systemPrompt);
  return result.text;
}

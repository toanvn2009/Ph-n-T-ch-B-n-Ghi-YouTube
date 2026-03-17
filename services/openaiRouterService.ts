import OpenAI from "openai";

let openaiInstance: OpenAI | null = null;

const getBaseURL = () => {
  const envURL = process.env.OPENAI_BASE_URL;
  const basePath = envURL || "/v1";

  if (basePath.startsWith("http")) {
    return basePath;
  }

  if (typeof window !== "undefined") {
    return window.location.origin + basePath;
  }

  return "http://localhost:3000" + basePath;
};

const getRouterClient = () => {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "sk_9router",
      baseURL: getBaseURL(),
      dangerouslyAllowBrowser: true,
    });
  }

  return openaiInstance;
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "combo-tw4";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1500): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status;
    const retriable = status === 429 || status === 502 || status === 503;

    if (retriable && retries > 0) {
      await sleep(delay);
      return withRetry(fn, retries - 1, Math.round(delay * 1.5));
    }

    throw error;
  }
}

function extractJson(content: string): string {
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlock?.[1]) {
    return codeBlock[1].trim();
  }

  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  return content.trim();
}

export async function generateRouterText(params: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const client = getRouterClient();

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (params.systemInstruction) {
    messages.push({ role: "system", content: params.systemInstruction });
  }
  messages.push({ role: "user", content: params.prompt });

  const response = await withRetry(() =>
    client.chat.completions.create({
      model: params.model || DEFAULT_MODEL,
      messages,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 8192,
    })
  );

  return response.choices[0]?.message?.content?.trim() || "";
}

export async function generateRouterJson<T>(params: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  model?: string;
}): Promise<T> {
  const raw = await generateRouterText({
    ...params,
    temperature: params.temperature ?? 0.2,
    prompt: `${params.prompt}\n\nCRITICAL: Return ONLY valid JSON. No extra text.`,
  });

  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch (error) {
    throw new Error("Phản hồi từ 9router không đúng định dạng JSON.");
  }
}

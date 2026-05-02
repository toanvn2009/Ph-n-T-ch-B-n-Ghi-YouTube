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
      console.warn('[router] retry', { status, retriesLeft: retries, nextDelayMs: delay });
      await sleep(delay);
      return withRetry(fn, retries - 1, Math.round(delay * 1.5));
    }

    console.error('[router] failed', { status, message: error?.message });
    throw error;
  }
}

function extractJson(content: string): string {
  const codeBlock = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlock?.[1]) {
    return codeBlock[1].trim();
  }

  const firstBrace = content.indexOf("{");
  if (firstBrace === -1) return content.trim();

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = firstBrace; i < content.length; i++) {
    const ch = content[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return content.slice(firstBrace, i + 1);
    }
  }

  const lastBrace = content.lastIndexOf("}");
  if (lastBrace > firstBrace) {
    return content.slice(firstBrace, lastBrace + 1);
  }

  return content.slice(firstBrace).trim();
}

export async function generateRouterText(params: {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const client = getRouterClient();
  const model = params.model || DEFAULT_MODEL;
  const t0 = performance.now();

  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (params.systemInstruction) {
    messages.push({ role: "system", content: params.systemInstruction });
  }
  messages.push({ role: "user", content: params.prompt });

  console.info('[router] -> text', { model, promptLen: params.prompt.length, temperature: params.temperature ?? 0.3 });

  const response = await withRetry(() =>
    client.chat.completions.create({
      model,
      messages,
      temperature: params.temperature ?? 0.3,
      max_tokens: params.maxTokens ?? 8192,
    })
  );

  const content = response.choices[0]?.message?.content?.trim() || "";
  console.info('[router] <- text', {
    ms: Math.round(performance.now() - t0),
    chars: content.length,
    finishReason: response.choices[0]?.finish_reason,
  });
  return content;
}

async function repairJson<T>(raw: string): Promise<T> {
  const repaired = await generateRouterText({
    temperature: 0,
    maxTokens: 16384,
    prompt: `Fix the following malformed JSON into valid JSON only. Preserve all fields and values. Do not add explanations.\n\n${raw}`,
  });
  return JSON.parse(extractJson(repaired)) as T;
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
    console.warn('[router] JSON parse failed, attempting repair', { rawPreview: raw.slice(0, 200) });
    try {
      return await repairJson<T>(raw);
    } catch {
      console.error('[router] JSON repair failed', { rawPreview: raw.slice(0, 500), rawTail: raw.slice(-500) });
      throw new Error("Phản hồi từ 9router không đúng định dạng JSON.");
    }
  }
}

export async function generateRouterJsonWithFile<T>(params: {
  prompt: string;
  file: { mimeType: string; data: string };
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<T> {
  const client = getRouterClient();

  const messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [];
  if (params.systemInstruction) {
    messages.push({ role: "system", content: params.systemInstruction });
  }

  messages.push({
    role: "user",
    content: [
      {
        type: "image_url",
        image_url: { url: `data:${params.file.mimeType};base64,${params.file.data}` },
      },
      {
        type: "text",
        text: `${params.prompt}\n\nCRITICAL: Return ONLY valid JSON. No extra text.`,
      },
    ],
  });

  const response = await withRetry(() =>
    client.chat.completions.create({
      model: params.model || DEFAULT_MODEL,
      messages,
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 8192,
      response_format: { type: "json_object" },
    }).catch(error => {
      if (error?.status === 400) {
        return client.chat.completions.create({
          model: params.model || DEFAULT_MODEL,
          messages,
          temperature: params.temperature ?? 0.2,
          max_tokens: params.maxTokens ?? 8192,
        });
      }
      throw error;
    })
  );

  const raw = response.choices[0]?.message?.content?.trim() || "";

  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch (error) {
    console.warn('[router] JSON file parse failed, attempting repair', {
      chars: raw.length,
      finishReason: response.choices[0]?.finish_reason,
      rawPreview: raw.slice(0, 500),
      rawTail: raw.slice(-500),
    });
    try {
      return await repairJson<T>(raw);
    } catch {
      console.error('[router] JSON file repair failed', {
        chars: raw.length,
        finishReason: response.choices[0]?.finish_reason,
        rawPreview: raw.slice(0, 500),
        rawTail: raw.slice(-500),
      });
      throw new Error("Phản hồi từ 9router không đúng định dạng JSON.");
    }
  }
}

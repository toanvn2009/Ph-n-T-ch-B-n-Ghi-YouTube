import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AnalysisResult, ScriptMetadata } from "../types";
import { generateRouterJson, generateRouterText } from "./openaiRouterService";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY (or API_KEY) environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const VALID_STYLES = [
  "Inspirational",
  "Fairy Tale",
  "Thriller/Mystery",
  "Sci-Fi",
  "Comedy",
  "Journalistic",
  "Cinematic",
  "Educational",
  "Review",
  "Debate",
  "Vlog",
];
const VALID_TONES = [
  "Emotional",
  "Enthusiastic",
  "Serious",
  "Witty",
  "Dark",
  "Chill",
  "Sarcastic",
  "Empathetic",
  "Urgent",
];
const VALID_AUDIENCES = ["General", "Kids", "Gen Z", "Professionals", "Tech Savvy", "Seniors"];
const VALID_PACING = ["Moderate", "Fast", "Slow", "Dynamic"];
const VALID_VOICES = ["Kore", "Puck", "Charon", "Fenrir", "Zephyr", "Aoede", "Leda", "Orus", "Alnilam", "Erinome"];

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "Chủ đề chính." },
    suggestedTitles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 tiêu đề video hấp dẫn, thu hút và chuẩn SEO YouTube.",
    },
    description: { type: Type.STRING, description: "Tóm tắt súc tích, hấp dẫn. Không dùng 'Video này...'." },
    keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestedHashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
    language: { type: Type.STRING },
    suggestedStyle: { type: Type.STRING, enum: VALID_STYLES },
    suggestedTone: { type: Type.STRING, enum: VALID_TONES },
    suggestedAudience: { type: Type.STRING, enum: VALID_AUDIENCES },
    suggestedPacing: { type: Type.STRING, enum: VALID_PACING },
    suggestedVoice: { type: Type.STRING, enum: VALID_VOICES },
    suggestedDuration: { type: Type.INTEGER },
    suggestedParts: { type: Type.INTEGER },
  },
  required: [
    "topic",
    "suggestedTitles",
    "description",
    "keyPoints",
    "suggestedHashtags",
    "language",
    "suggestedStyle",
    "suggestedTone",
    "suggestedAudience",
    "suggestedPacing",
    "suggestedVoice",
    "suggestedDuration",
    "suggestedParts",
  ],
};

export interface GeneratedScriptResult {
  parts: string[];
  metadata: ScriptMetadata;
}

export type ContentInput =
  | { type: "text"; content: string }
  | { type: "file"; mimeType: string; data: string };

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callApiWithRetry<T>(apiCall: () => Promise<T>, retries = 5, baseDelay = 5000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await apiCall();
    } catch (error: any) {
      const errorMsg = String(error).toLowerCase();
      if (
        (errorMsg.includes("429") ||
          errorMsg.includes("resource_exhausted") ||
          errorMsg.includes("quota") ||
          errorMsg.includes("503")) &&
        i < retries - 1
      ) {
        await delay(Math.pow(2, i) * baseDelay + Math.random() * 2000);
        continue;
      }
      throw error;
    }
  }
  throw new Error("API call failed after max retries.");
}

function sanitizeAnalysisResult(raw: Partial<AnalysisResult>): AnalysisResult {
  return {
    topic: raw.topic || "",
    suggestedTitles: (raw.suggestedTitles || []).slice(0, 3),
    description: raw.description || "",
    keyPoints: raw.keyPoints || [],
    suggestedHashtags: raw.suggestedHashtags || [],
    language: raw.language || "Tiếng Việt",
    suggestedStyle: VALID_STYLES.includes(raw.suggestedStyle || "") ? raw.suggestedStyle : "Inspirational",
    suggestedTone: VALID_TONES.includes(raw.suggestedTone || "") ? raw.suggestedTone : "Emotional",
    suggestedAudience: VALID_AUDIENCES.includes(raw.suggestedAudience || "") ? raw.suggestedAudience : "General",
    suggestedPacing: VALID_PACING.includes(raw.suggestedPacing || "") ? raw.suggestedPacing : "Moderate",
    suggestedVoice: VALID_VOICES.includes(raw.suggestedVoice || "") ? raw.suggestedVoice : "Kore",
    suggestedDuration: Number(raw.suggestedDuration || 3),
    suggestedParts: Number(raw.suggestedParts || 3),
  };
}

export const analyzeTranscript = async (input: ContentInput): Promise<AnalysisResult> => {
  const systemInstruction = `Bạn là chuyên gia phân tích nội dung.
LƯU Ý: Nếu bản ghi có chứa mốc thời gian (ví dụ 00:00, 00:01), hãy bỏ qua chúng và chỉ tập trung vào nội dung lời nói.
'DESCRIPTION' PHẢI viết dưới dạng kể chuyện dẫn dắt, TUYỆT ĐỐI KHÔNG bắt đầu bằng 'Video này...'.
Hãy đề xuất 3 tiêu đề video YouTube hấp dẫn, chuẩn SEO và thu hút người xem click.`;

  const analysisPrompt = `
Nhiệm vụ: Phân tích bản ghi, đề xuất 3 tiêu đề thu hút, tóm tắt hấp dẫn và đề xuất cấu hình sáng tạo phù hợp.
Hashtags: 5 tag tiếng Việt không dấu.
Voice gợi ý: Chọn 1 trong các tên giọng đọc AI có sẵn.

Trả về JSON với đầy đủ các trường:
- topic
- suggestedTitles (3 items)
- description
- keyPoints
- suggestedHashtags
- language
- suggestedStyle
- suggestedTone
- suggestedAudience
- suggestedPacing
- suggestedVoice
- suggestedDuration (phút)
- suggestedParts
`;

  try {
    if (input.type === "text") {
      const result = await generateRouterJson<Partial<AnalysisResult>>({
        systemInstruction,
        temperature: 0.3,
        prompt: `${analysisPrompt}\n\nBản ghi cần phân tích:\n${input.content}`,
      });
      return sanitizeAnalysisResult(result);
    }

    // Hybrid fallback: file analysis vẫn dùng Gemini SDK để đảm bảo khả năng xử lý inlineData
    const text = await callApiWithRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { inlineData: { mimeType: input.mimeType, data: input.data } },
          { text: `Phân tích nội dung này.\n\n${analysisPrompt}` },
        ],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.3,
        },
      });

      if (!response.text) {
        throw new Error("Received empty response text from AI.");
      }
      return response.text;
    });

    return sanitizeAnalysisResult(JSON.parse(text.trim()) as Partial<AnalysisResult>);
  } catch (error) {
    console.error(error);
    throw new Error("Không thể phân tích nội dung. Vui lòng thử lại.");
  }
};

export const translateResult = async (result: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
  const prompt = `Translate the following analysis to ${targetLanguage}.
Description must be engaging story-like narration and must not start with 'This video...'.
Preserve structure and return JSON using the same fields as input.

Input JSON:\n${JSON.stringify(result)}`;

  const translated = await generateRouterJson<Partial<AnalysisResult>>({
    prompt,
    temperature: 0.2,
  });

  return sanitizeAnalysisResult(translated);
};

const generateScriptMetadata = async (
  result: AnalysisResult,
  language: string,
  style: string,
  tone: string
): Promise<ScriptMetadata> => {
  const prompt = `Generate YouTube SEO metadata in ${language}.
Topic: ${result.topic}
Style: ${style}
Tone: ${tone}
Key points: ${result.keyPoints.join(" | ")}

Return JSON with keys: titles (3 items), description, hashtags (5-8 items).`;

  const metadata = await generateRouterJson<ScriptMetadata>({
    prompt,
    temperature: 0.6,
  });

  return {
    titles: metadata.titles || [],
    description: metadata.description || "",
    hashtags: metadata.hashtags || [],
  };
};

const translateScriptMetadata = async (metadata: ScriptMetadata, targetLanguage: string): Promise<ScriptMetadata> => {
  const translated = await generateRouterJson<ScriptMetadata>({
    prompt: `Translate this metadata to ${targetLanguage} and return JSON with keys titles, description, hashtags:\n${JSON.stringify(
      metadata
    )}`,
    temperature: 0.3,
  });

  return {
    titles: translated.titles || [],
    description: translated.description || "",
    hashtags: translated.hashtags || [],
  };
};

export const generateScript = async (
  translatedResult: AnalysisResult,
  totalDuration: number,
  numberOfParts: number,
  language: string,
  style: string = "Inspirational",
  tone: string = "Emotional",
  creativity: "low" | "medium" | "high" = "medium",
  plotTwist: string = "None",
  characterArchetype: string = "Narrator",
  focus: string = "Balanced",
  targetAudience: string = "General",
  pacing: string = "Moderate"
): Promise<GeneratedScriptResult> => {
  const parts: string[] = [];
  let previousContext = "";
  const durationPerPart = totalDuration / numberOfParts;
  const temperature = creativity === "low" ? 0.2 : creativity === "medium" ? 0.6 : 0.9;

  try {
    const metadata = await generateScriptMetadata(translatedResult, language, style, tone);
    await delay(1200);

    for (let partIndex = 1; partIndex <= numberOfParts; partIndex++) {
      const wordCount = Math.round(durationPerPart * 140);
      const prompt = `Write part ${partIndex}/${numberOfParts} in ${language}.

Context:
- Topic: ${translatedResult.topic}
- Key points: ${translatedResult.keyPoints.join(" | ")}
- Style: ${style}
- Tone: ${tone}
- Plot twist: ${plotTwist}
- Character archetype: ${characterArchetype}
- Focus: ${focus}
- Target audience: ${targetAudience}
- Pacing: ${pacing}
- Desired length: ~${wordCount} words

Rules:
- Keep continuity with previous parts.
- Avoid generic openings.
- Maintain the requested style and pacing consistently.
${partIndex > 1 ? `\nPrevious script context:\n${previousContext.slice(-1500)}` : ""}`;

      const partText = await generateRouterText({
        prompt,
        temperature,
        maxTokens: 8192,
      });

      parts.push(partText.trim());
      previousContext += `\n${partText.trim()}`;

      if (partIndex < numberOfParts) {
        await delay(1000);
      }
    }

    return { parts, metadata };
  } catch (error) {
    throw error;
  }
};

export const translateStory = async (
  scriptParts: string[],
  metadata: ScriptMetadata,
  targetLanguage: string,
  onProgress?: (progress: number) => void
): Promise<{ parts: string[]; metadata: ScriptMetadata }> => {
  const translatedParts: string[] = [];
  let previousTranslatedContext = "";

  try {
    const translatedMetadata = await translateScriptMetadata(metadata, targetLanguage);
    await delay(800);

    for (let i = 0; i < scriptParts.length; i++) {
      const text = await generateRouterText({
        prompt: `Translate the following script part to ${targetLanguage} while preserving narrative style and continuity.

Current part:
${scriptParts[i]}

Previous translated context:
${previousTranslatedContext.slice(-800)}`,
        temperature: 0.3,
        maxTokens: 8192,
      });

      translatedParts.push(text.trim());
      previousTranslatedContext += `\n${text.trim()}`;

      if (onProgress) {
        onProgress(Math.round(((i + 1) / scriptParts.length) * 100));
      }

      await delay(800);
    }

    return { parts: translatedParts, metadata: translatedMetadata };
  } catch (error) {
    throw error;
  }
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
  return await callApiWithRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say this in a perfectly consistent, professional voice: ${text}` }] }],
      config: {
        systemInstruction:
          "You are a professional voice artist. You must maintain the exact same pitch, tone, and delivery speed for every sentence. Do not deviate or become more emotional as you read. Consistency is paramount.",
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data");
    }

    return base64Audio;
  });
};

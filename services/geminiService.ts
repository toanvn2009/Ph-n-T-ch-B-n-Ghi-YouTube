import { GoogleGenAI } from "@google/genai";
import type { AnalysisResult, ScriptMetadata } from "../types";
import { generateRouterJson, generateRouterText, generateRouterJsonWithFile } from "./openaiRouterService";
import {
  STYLES, TONES, TARGET_AUDIENCES, PACING_OPTIONS,
  ARCHETYPES, FOCUS_OPTIONS, PLOT_TWISTS,
} from "../constants";

// ─── API Setup ───
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY (or API_KEY) environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// ─── Validation Lists (derived from constants.ts — Single Source of Truth) ───
const VALID_STYLES = STYLES.map(s => s.value) as string[];
const VALID_TONES = TONES.map(t => t.value) as string[];
const VALID_AUDIENCES = TARGET_AUDIENCES.map(a => a.value) as string[];
const VALID_PACING = PACING_OPTIONS.map(p => p.value) as string[];

// ─── Helpers ───
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
    suggestedVoice: raw.suggestedVoice || "vi-VN-HoaiMyNeural",
    suggestedDuration: Number(raw.suggestedDuration || 3),
    suggestedParts: Number(raw.suggestedParts || 3),
  };
}

// ─── Exported Types ───
export interface GeneratedScriptResult {
  parts: string[];
  metadata: ScriptMetadata;
}

export type ContentInput =
  | { type: "text"; content: string }
  | { type: "file"; mimeType: string; data: string };

export interface ScriptGenerationOptions {
  translatedResult: AnalysisResult;
  totalDuration: number;
  numberOfParts: number;
  language: string;
  style?: string;
  tone?: string;
  creativity?: "low" | "medium" | "high";
  plotTwist?: string;
  characterArchetype?: string;
  focus?: string;
  targetAudience?: string;
  pacing?: string;
}

// ─── Analysis ───
const ANALYSIS_SYSTEM_INSTRUCTION = `Bạn là chuyên gia phân tích nội dung.
LƯU Ý: Nếu bản ghi có chứa mốc thời gian (ví dụ 00:00, 00:01), hãy bỏ qua chúng và chỉ tập trung vào nội dung lời nói.
'DESCRIPTION' PHẢI viết dưới dạng kể chuyện dẫn dắt, TUYỆT ĐỐI KHÔNG bắt đầu bằng 'Video này...'.
Hãy đề xuất 3 tiêu đề video YouTube hấp dẫn, chuẩn SEO và thu hút người xem click.`;

const ANALYSIS_PROMPT = `
Nhiệm vụ: Phân tích bản ghi, đề xuất 3 tiêu đề thu hút, tóm tắt hấp dẫn và đề xuất cấu hình sáng tạo phù hợp.
Hashtags: 5 tag tiếng Việt không dấu.
Voice gợi ý: Chọn 1 tên giọng đọc Edge TTS (ví dụ vi-VN-HoaiMyNeural, en-US-GuyNeural).

Trả về JSON với đầy đủ các trường:
- topic, suggestedTitles (3 items), description, keyPoints, suggestedHashtags
- language, suggestedStyle, suggestedTone, suggestedAudience, suggestedPacing
- suggestedVoice, suggestedDuration (phút), suggestedParts
`;

export const analyzeTranscript = async (input: ContentInput): Promise<AnalysisResult> => {
  try {
    if (input.type === "text") {
      const result = await generateRouterJson<Partial<AnalysisResult>>({
        systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
        temperature: 0.3,
        prompt: `${ANALYSIS_PROMPT}\n\nBản ghi cần phân tích:\n${input.content}`,
      });
      return sanitizeAnalysisResult(result);
    }

    const result = await generateRouterJsonWithFile<Partial<AnalysisResult>>({
      systemInstruction: ANALYSIS_SYSTEM_INSTRUCTION,
      temperature: 0.3,
      prompt: `Phân tích nội dung này.\n\n${ANALYSIS_PROMPT}`,
      file: { mimeType: input.mimeType, data: input.data },
    });
    return sanitizeAnalysisResult(result);
  } catch (error) {
    console.error(error);
    throw new Error("Không thể phân tích nội dung. Vui lòng thử lại.");
  }
};

// ─── Translation ───
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

// ─── Script Metadata (SEO) ───
const generateScriptMetadata = async (
  result: AnalysisResult,
  language: string,
  options: Pick<ScriptGenerationOptions, "style" | "tone" | "plotTwist" | "characterArchetype" | "focus" | "targetAudience" | "pacing">
): Promise<ScriptMetadata> => {
  const prompt = `Generate YouTube SEO metadata in ${language}.
Topic: ${result.topic}
Style: ${options.style || "Inspirational"}
Tone: ${options.tone || "Emotional"}
Plot Twist: ${options.plotTwist || "None"}
Character: ${options.characterArchetype || "Narrator"}
Focus: ${options.focus || "Balanced"}
Target Audience: ${options.targetAudience || "General"}
Pacing: ${options.pacing || "Moderate"}
Key points: ${result.keyPoints.join(" | ")}

Return JSON with keys: titles (3 items), description, hashtags (5-8 items).
Titles and description MUST reflect the style, tone, and creative config above.`;

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
    prompt: `Translate this metadata to ${targetLanguage} and return JSON with keys titles, description, hashtags:\n${JSON.stringify(metadata)}`,
    temperature: 0.3,
  });

  return {
    titles: translated.titles || [],
    description: translated.description || "",
    hashtags: translated.hashtags || [],
  };
};

// ─── Script Generation ───
export const generateScript = async (opts: ScriptGenerationOptions): Promise<GeneratedScriptResult> => {
  const {
    translatedResult,
    totalDuration,
    numberOfParts,
    language,
    style = "Inspirational",
    tone = "Emotional",
    creativity = "medium",
    plotTwist = "None",
    characterArchetype = "Narrator",
    focus = "Balanced",
    targetAudience = "General",
    pacing = "Moderate",
  } = opts;

  const parts: string[] = [];
  let previousContext = "";
  const durationPerPart = totalDuration / numberOfParts;
  const temperature = creativity === "low" ? 0.2 : creativity === "medium" ? 0.6 : 0.9;

  const metadata = await generateScriptMetadata(translatedResult, language, {
    style, tone, plotTwist, characterArchetype, focus, targetAudience, pacing,
  });
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

Primary Goal:
- Create ONE complete story with a clear beginning, middle, climax, and ending.
- Every part must feel like a chapter of the SAME story, not separate essays or loosely related sections.

Story Structure Rules:
- Part 1 must establish the setting, character perspective, stakes, and the core conflict.
- Middle parts must escalate tension, deepen the conflict, and move the story forward with meaningful developments.
- The final part must deliver the climax and a satisfying resolution.
- If plot twist is NOT "Cliffhanger", the ending MUST feel closed, complete, and emotionally resolved.
- Only when plot twist is "Cliffhanger" may the ending remain intentionally open.

Writing Rules:
- Keep strong continuity with previous parts.
- Avoid generic openings.
- Do not repeat the same idea without progression.
- Ensure each part changes the situation, emotion, or stakes.
- Maintain the requested style and pacing consistently.
- Prioritize storytelling over explanation. This must read like a finished narrative, not a content outline.
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
};

// ─── Story Translation ───
export const translateStory = async (
  scriptParts: string[],
  metadata: ScriptMetadata,
  targetLanguage: string,
  onProgress?: (progress: number) => void
): Promise<{ parts: string[]; metadata: ScriptMetadata }> => {
  const translatedParts: string[] = [];
  let previousTranslatedContext = "";

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
};

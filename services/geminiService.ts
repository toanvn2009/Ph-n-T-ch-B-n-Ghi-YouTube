import { GoogleGenAI } from "@google/genai";
import type { AnalysisResult, ScriptMetadata, VideoSegmentation, VideoSegment, VideoShot } from "../types";
import { generateRouterJson, generateRouterText, generateRouterJsonWithFile } from "./openaiRouterService";
// Note: GoogleGenAI is kept imported in case future features need direct Gemini SDK access.
// All current calls go through 9router (OpenAI-compatible) for unified routing.
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
    videoSegmentation: raw.videoSegmentation
      ? sanitizeSegmentation(raw.videoSegmentation as Partial<VideoSegmentation>)
      : undefined,
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

// ─── Video Deep Analysis (Segmentation + Shots) ───
const SEGMENTATION_SYSTEM_INSTRUCTION = `Bạn là chuyên gia dựng phim, biên tập video và logging shot-by-shot.
Khi nhận một file video, hãy quan sát toàn bộ video theo timeline và tạo shot list chi tiết như bảng dựng phim: chia thành các PHÂN ĐOẠN lớn, sau đó liệt kê mọi PHÂN CẢNH nhỏ bên trong.
Ưu tiên độ phủ timeline và chi tiết thị giác/âm thanh; không tóm tắt kiểu nội dung chung.`;

const SEGMENTATION_PROMPT = `Nhiệm vụ: Phân tích PHÂN CẢNH VIDEO thật chi tiết, bám sát video upload.

Yêu cầu trả về JSON DUY NHẤT theo schema:
{
  "pacingNote": "Mô tả nhịp độ tổng thể + xác nhận đã quét theo lát 6-10 giây.",
  "totalSegments": <số nguyên>,
  "segments": [
    {
      "index": 1,
      "title": "Tên ngắn gọn của phân đoạn (vd: 'Buổi sáng & Bữa sáng')",
      "timeRange": "MM:SS - MM:SS",
      "content": "Mô tả nội dung diễn ra trong phân đoạn, nêu rõ hành động/vật thể/bối cảnh chính.",
      "mood": "Không khí của phân đoạn (vd: 'Thư thái, khởi đầu chậm rãi').",
      "shots": [
        {
          "index": 1,
          "timeRange": "MM:SS - MM:SS",
          "description": "Mô tả cụ thể shot này: khung hình/camera, chủ thể, hành động, vật thể nổi bật, ánh sáng/màu sắc, âm thanh/lời thoại nếu có."
        }
      ]
    }
  ]
}

QUY TẮC BẮT BUỘC:
- Toàn bộ text bằng tiếng Việt.
- Phải quét video theo timeline từ đầu đến cuối; KHÔNG bỏ qua khoảng thời gian nào có hình ảnh/âm thanh mới.
- Mỗi shot nên dài khoảng 6-10 giây; nếu trong 6-10 giây có chuyển cảnh/hành động mới thì tách shot nhỏ hơn.
- Mỗi shot PHẢI có timeRange riêng và mô tả 1 câu cụ thể, khoảng 18-28 từ, đủ nhận diện cảnh.
- Không gộp nhiều cảnh khác nhau vào một shot chỉ vì cùng bối cảnh.
- Không dùng câu chung chung như "cảnh sinh hoạt", "nhân vật làm việc"; phải nói rõ đang thấy gì, ai/vật gì, làm gì, camera nhìn thế nào, âm thanh gì.
- Số shot phải tỷ lệ với độ dài video: video 1 phút khoảng 6-10 shots, 3 phút khoảng 18-30 shots, 5 phút khoảng 30-50 shots.
- Số lượng phân đoạn lớn thường 4-10, tùy nội dung; phân đoạn chỉ để nhóm shot, không được làm mất chi tiết.
- timeRange dùng định dạng MM:SS, lấy từ timeline thực tế của video.
- KHÔNG thêm bất kỳ text nào ngoài JSON.`;

function sanitizeSegmentation(raw: Partial<VideoSegmentation>): VideoSegmentation {
  const segments: VideoSegment[] = (raw.segments || []).map((s, i) => ({
    index: Number(s?.index ?? i + 1),
    title: String(s?.title ?? `Phân đoạn ${i + 1}`),
    timeRange: String(s?.timeRange ?? ""),
    content: String(s?.content ?? ""),
    mood: String(s?.mood ?? ""),
    shots: (s?.shots || []).map((sh: Partial<VideoShot>, j: number) => ({
      index: Number(sh?.index ?? j + 1),
      timeRange: sh?.timeRange ? String(sh.timeRange) : undefined,
      description: String(sh?.description ?? ""),
    })),
  }));
  return {
    totalSegments: Number(raw.totalSegments ?? segments.length),
    pacingNote: String(raw.pacingNote ?? ""),
    segments,
  };
}

export const analyzeVideoSegmentation = async (
  file: { mimeType: string; data: string }
): Promise<VideoSegmentation> => {
  const t0 = performance.now();
  console.info('[gemini] analyzeVideoSegmentation start', { mimeType: file.mimeType });
  try {
    const raw = await generateRouterJsonWithFile<Partial<VideoSegmentation>>({
      systemInstruction: SEGMENTATION_SYSTEM_INSTRUCTION,
      temperature: 0.2,
      maxTokens: 16384,
      prompt: SEGMENTATION_PROMPT,
      file,
    });
    console.info('[gemini] analyzeVideoSegmentation done', {
      ms: Math.round(performance.now() - t0),
      segments: raw?.segments?.length,
    });
    return sanitizeSegmentation(raw);
  } catch (error) {
    console.error('[gemini] analyzeVideoSegmentation error', { ms: Math.round(performance.now() - t0), error });
    throw new Error("Không thể phân tích phân cảnh video. Vui lòng thử lại.");
  }
};

// ─── Translation ───
const hasVietnameseDiacritics = (text: string) => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);

export const translateResult = async (result: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
  const t0 = performance.now();
  console.info('[gemini] translateResult start', { targetLanguage, fromLang: result.language, hasSegmentation: !!result.videoSegmentation });
  const prompt = `Translate the following analysis into ${targetLanguage}.

STRICT LANGUAGE RULES:
- Every human-readable text field in the output MUST be written in ${targetLanguage}.
- Set the output field "language" exactly to "${targetLanguage}".
- Do NOT keep Vietnamese text when targetLanguage is English, except proper names that should not be translated.
- Do NOT summarize, rewrite into a new topic, or leave fields in the source language.

FIELDS TO TRANSLATE:
- topic
- suggestedTitles[]
- description
- keyPoints[]
- suggestedHashtags[]: translate meaning and format as short hashtag words in ${targetLanguage}
- language

Description must be engaging story-like narration and must not start with 'This video...'.
Preserve the same JSON structure and return JSON using the same fields as input.

IMPORTANT: If the input contains a 'videoSegmentation' field, you MUST translate it as well:
- Translate text fields: pacingNote, segments[].title, segments[].content, segments[].mood, segments[].shots[].description
- KEEP UNCHANGED: totalSegments, segments[].index, segments[].timeRange, segments[].shots[].index, segments[].shots[].timeRange
- Preserve the exact same array order and structure.

Input JSON:\n${JSON.stringify(result)}`;

  try {
    let translated = await generateRouterJson<Partial<AnalysisResult>>({
      prompt,
      temperature: 0.1,
    });
    let sanitized = sanitizeAnalysisResult(translated);

    if (targetLanguage === "English" && hasVietnameseDiacritics([
      sanitized.topic,
      ...sanitized.suggestedTitles,
      sanitized.description,
      ...sanitized.keyPoints,
    ].join(" "))) {
      translated = await generateRouterJson<Partial<AnalysisResult>>({
        prompt: `${prompt}\n\nThe previous output incorrectly kept Vietnamese text. Return the same JSON again, but translate ALL human-readable text into natural English now.`,
        temperature: 0,
      });
      sanitized = sanitizeAnalysisResult(translated);
    }

    console.info('[gemini] translateResult done', { ms: Math.round(performance.now() - t0), targetLanguage: sanitized.language });
    return sanitized;
  } catch (err) {
    console.error('[gemini] translateResult error', { ms: Math.round(performance.now() - t0), err });
    throw err;
  }
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
  const t0 = performance.now();
  console.info('[gemini] generateScript start', {
    parts: opts.numberOfParts,
    durationMin: opts.totalDuration,
    lang: opts.language,
    style: opts.style,
    creativity: opts.creativity,
  });
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

    console.info('[gemini] generateScript part done', { partIndex, words: partText.trim().split(/\s+/).length });
    if (partIndex < numberOfParts) {
      await delay(1000);
    }
  }

  console.info('[gemini] generateScript done', { ms: Math.round(performance.now() - t0), totalParts: parts.length });
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

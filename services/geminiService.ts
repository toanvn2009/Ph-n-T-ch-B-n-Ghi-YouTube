
import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { AnalysisResult, ScriptMetadata, ScriptData } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const VALID_STYLES = ['Inspirational', 'Fairy Tale', 'Thriller/Mystery', 'Sci-Fi', 'Comedy', 'Journalistic', 'Cinematic', 'Educational', 'Review', 'Debate', 'Vlog'];
const VALID_TONES = ['Emotional', 'Enthusiastic', 'Serious', 'Witty', 'Dark', 'Chill', 'Sarcastic', 'Empathetic', 'Urgent'];
const VALID_AUDIENCES = ['General', 'Kids', 'Gen Z', 'Professionals', 'Tech Savvy', 'Seniors'];
const VALID_PACING = ['Moderate', 'Fast', 'Slow', 'Dynamic'];
const VALID_VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr', 'Aoede', 'Leda', 'Orus', 'Alnilam', 'Erinome'];

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "Chủ đề chính." },
    suggestedTitles: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "3 tiêu đề video hấp dẫn, thu hút và chuẩn SEO YouTube." 
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
    suggestedParts: { type: Type.INTEGER }
  },
  required: ['topic', 'suggestedTitles', 'description', 'keyPoints', 'suggestedHashtags', 'language', 'suggestedStyle', 'suggestedTone', 'suggestedAudience', 'suggestedPacing', 'suggestedVoice', 'suggestedDuration', 'suggestedParts'],
};

export interface GeneratedScriptResult {
    parts: string[];
    metadata: ScriptMetadata;
}

export type ContentInput = 
  | { type: 'text'; content: string }
  | { type: 'file'; mimeType: string; data: string };

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callApiWithRetry<T>(apiCall: () => Promise<T>, retries = 5, baseDelay = 5000): Promise<T> {
    for (let i = 0; i < retries; i++) {
        try {
            return await apiCall();
        } catch (error: any) {
            const errorMsg = error.toString().toLowerCase();
            if ((errorMsg.includes("429") || errorMsg.includes("resource_exhausted") || errorMsg.includes("quota") || errorMsg.includes("503")) && i < retries - 1) {
                await delay(Math.pow(2, i) * baseDelay + (Math.random() * 2000));
                continue;
            }
            throw error;
        }
    }
    throw new Error("API call failed after max retries.");
}

async function generateTextWithRetry(params: any): Promise<string> {
    return callApiWithRetry(async () => {
        const response = await ai.models.generateContent(params);
        if (response.text) return response.text;
        throw new Error("Received empty response text from AI.");
    });
}

const splitTextSafe = (text: string, maxLength: number = 3500): string[] => {
    if (!text || text.length <= maxLength) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        let end = Math.min(start + maxLength, text.length);
        if (end < text.length) {
            let breakPoint = text.lastIndexOf('\n', end);
            if (breakPoint <= start) breakPoint = text.lastIndexOf('.', end);
            if (breakPoint > start) end = breakPoint + 1;
        }
        chunks.push(text.slice(start, end));
        start = end;
    }
    return chunks;
};

export const analyzeTranscript = async (input: ContentInput): Promise<AnalysisResult> => {
  try {
    let contents: any[] = [];
    const systemInstruction = `Bạn là chuyên gia phân tích nội dung. 
    LƯU Ý: Nếu bản ghi có chứa mốc thời gian (ví dụ 00:00, 00:01), hãy bỏ qua chúng và chỉ tập trung vào nội dung lời nói.
    'DESCRIPTION' PHẢI viết dưới dạng kể chuyện dẫn dắt, TUYỆT ĐỐI KHÔNG bắt đầu bằng 'Video này...'.
    Hãy đề xuất 3 tiêu đề video YouTube hấp dẫn, chuẩn SEO và thu hút người xem click.`;

    const extraPrompt = `
    Nhiệm vụ: Phân tích bản ghi, đề xuất 3 tiêu đề thu hút, tóm tắt hấp dẫn và đề xuất cấu hình sáng tạo phù hợp.
    Hashtags: 5 tag tiếng Việt không dấu.
    Voice gợi ý: Chọn 1 trong các tên giọng đọc AI có sẵn.
    `;

    if (input.type === 'text') {
        contents = [{ text: `Phân tích bản ghi sau (JSON): ${extraPrompt}\n\n**Bản ghi:**\n${input.content}` }];
    } else if (input.type === 'file') {
        contents = [
            { inlineData: { mimeType: input.mimeType, data: input.data } },
            { text: `Phân tích nội dung này. ${extraPrompt}` }
        ];
    }

    const text = await generateTextWithRetry({
      model: "gemini-2.5-flash",
      contents: contents,
      config: { systemInstruction, responseMimeType: "application/json", responseSchema, temperature: 0.3 },
    });

    return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error) {
    console.error(error);
    throw new Error("Không thể phân tích nội dung. Vui lòng thử lại.");
  }
};

export const translateResult = async (result: AnalysisResult, targetLanguage: string): Promise<AnalysisResult> => {
  const prompt = `Translate to ${targetLanguage}. Description must be engaging story-like narration. No 'This video...'.
  Translate the 3 suggested titles to be culturally relevant and engaging in ${targetLanguage}.
  
  Topic: ${result.topic}
  Suggested Titles: ${result.suggestedTitles.join(' | ')}
  Description: ${result.description}
  Key Points: ${result.keyPoints.join('\n')}`;
  
  try {
      const text = await generateTextWithRetry({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
      });
      return JSON.parse(text.trim()) as AnalysisResult;
  } catch (error) { throw new Error(`Lỗi dịch sang ${targetLanguage}.`); }
};

const generateScriptMetadata = async (result: AnalysisResult, language: string, style: string, tone: string): Promise<ScriptMetadata> => {
    const prompt = `Generate SEO metadata in ${language}: Topic: ${result.topic}, Style: ${style}, Tone: ${tone}. Return JSON.`;
    const metadataSchema = {
        type: Type.OBJECT,
        properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['titles', 'description', 'hashtags']
    };
    const text = await generateTextWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: metadataSchema, temperature: 0.7 }
    });
    return JSON.parse(text.trim()) as ScriptMetadata;
};

const translateScriptMetadata = async (metadata: ScriptMetadata, targetLanguage: string): Promise<ScriptMetadata> => {
    const prompt = `Translate metadata to ${targetLanguage}: ${JSON.stringify(metadata)}`;
    const metadataSchema = {
        type: Type.OBJECT,
        properties: {
            titles: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['titles', 'description', 'hashtags']
    };
    const text = await generateTextWithRetry({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: metadataSchema, temperature: 0.5 },
    });
    return JSON.parse(text.trim()) as ScriptMetadata;
}

export const generateScript = async (
    translatedResult: AnalysisResult, totalDuration: number, numberOfParts: number, language: string,
    style: string = 'Inspirational', tone: string = 'Emotional', creativity: 'low' | 'medium' | 'high' = 'medium',
    plotTwist: string = 'None', characterArchetype: string = 'Narrator', focus: string = 'Balanced', targetAudience: string = 'General', pacing: string = 'Moderate'
): Promise<GeneratedScriptResult> => {
    const parts: string[] = [];
    let previousContext = "";
    const durationPerPart = totalDuration / numberOfParts;
    const temperature = creativity === 'low' ? 0.2 : creativity === 'medium' ? 0.6 : 0.9;

    try {
        const metadata = await generateScriptMetadata(translatedResult, language, style, tone);
        await delay(2000);
        for (let partIndex = 1; partIndex <= numberOfParts; partIndex++) {
            const wordCount = Math.round(durationPerPart * 140);
            const prompt = `Write Part ${partIndex}/${numberOfParts} in ${language}. 
            Topic: ${translatedResult.topic}. Style: ${style}, Tone: ${tone}. 
            Words: ~${wordCount}.
            ${partIndex > 1 ? `Previous: ${previousContext.slice(-1000)}` : ''}`;

            const partText = await generateTextWithRetry({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { temperature, maxOutputTokens: 8192 },
            });
            parts.push(partText.trim());
            previousContext += "\n" + partText.trim();
            if (partIndex < numberOfParts) await delay(3000);
        }
        return { parts, metadata };
    } catch (error) { throw error; }
};

export const translateStory = async (scriptParts: string[], metadata: ScriptMetadata, targetLanguage: string, onProgress?: (progress: number) => void): Promise<{ parts: string[], metadata: ScriptMetadata }> => {
    const translatedParts: string[] = [];
    let previousTranslatedContext = "";
    try {
        const translatedMetadata = await translateScriptMetadata(metadata, targetLanguage);
        await delay(1000);
        for (let i = 0; i < scriptParts.length; i++) {
            const prompt = `Translate to ${targetLanguage}: ${scriptParts[i]}\nContext: ${previousTranslatedContext.slice(-500)}`;
            const text = await generateTextWithRetry({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: { temperature: 0.3, maxOutputTokens: 8192 },
            });
            translatedParts.push(text.trim());
            previousTranslatedContext += "\n" + text.trim();
            if (onProgress) onProgress(Math.round(((i + 1) / scriptParts.length) * 100));
            await delay(1500);
        }
        return { parts: translatedParts, metadata: translatedMetadata };
    } catch (error) { throw error; }
};

export const generateSpeech = async (text: string, voiceName: string): Promise<string> => {
    return await callApiWithRetry(async () => {
         const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            // Thêm hướng dẫn vào prompt để định hình giọng đọc ổn định
            contents: [{ parts: [{ text: `Say this in a perfectly consistent, professional voice: ${text}` }] }],
            config: {
                systemInstruction: "You are a professional voice artist. You must maintain the exact same pitch, tone, and delivery speed for every sentence. Do not deviate or become more emotional as you read. Consistency is paramount.",
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio data");
        return base64Audio;
    });
};

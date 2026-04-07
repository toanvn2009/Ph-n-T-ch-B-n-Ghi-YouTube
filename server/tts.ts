import express from "express";
import cors from "cors";
import fs from "fs";
import { Communicate } from "edge-tts-universal";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Danh sách giọng Việt Nam (Native + Multilingual) ───
const VIETNAMESE_VOICES = [
  // Native Vietnamese
  { value: "vi-VN-HoaiMyNeural", label: "Hoài My (Nữ, Dịu dàng)", gender: "Female", locale: "vi-VN" },
  { value: "vi-VN-NamMinhNeural", label: "Nam Minh (Nam, Trầm ấm)", gender: "Male", locale: "vi-VN" },
  // Multilingual ổn định với tiếng Việt (đã test OK)
  { value: "en-US-AndrewMultilingualNeural", label: "Andrew (Nam, Tự tin) [Multilingual OK]", gender: "Male", locale: "vi-VN" },
  { value: "en-US-BrianMultilingualNeural", label: "Brian (Nam, Điềm đạm) [Multilingual OK]", gender: "Male", locale: "vi-VN" },
  { value: "en-US-EmmaMultilingualNeural", label: "Emma (Nữ, Biểu cảm) [Multilingual OK]", gender: "Female", locale: "vi-VN" },
  { value: "en-US-AvaMultilingualNeural", label: "Ava (Nữ, Tự nhiên) [Multilingual OK]", gender: "Female", locale: "vi-VN" },
];

const ENGLISH_VOICES = [
  { value: "en-US-AriaNeural", label: "Aria (Nữ, News) [News]", gender: "Female", locale: "en-US" },
  { value: "en-US-GuyNeural", label: "Guy (Nam, Storytelling) [YouTube][News]", gender: "Male", locale: "en-US" },
  { value: "en-US-JennyNeural", label: "Jenny (Nữ, US) [Learning][YouTube]", gender: "Female", locale: "en-US" },
  { value: "en-US-SteffanNeural", label: "Steffan (Nam, Podcast) [Podcast]", gender: "Male", locale: "en-US" },
  { value: "en-US-ChristopherNeural", label: "Christopher (Nam, Professional)", gender: "Male", locale: "en-US" },
  { value: "en-US-EricNeural", label: "Eric (Nam, Modern)", gender: "Male", locale: "en-US" },
  { value: "en-GB-RyanNeural", label: "Ryan (Nam, UK) [Podcast]", gender: "Male", locale: "en-GB" },
  { value: "en-GB-LibbyNeural", label: "Libby (Nữ, UK) [Podcast]", gender: "Female", locale: "en-GB" },
  { value: "en-GB-SoniaNeural", label: "Sonia (Nữ, UK) [Learning]", gender: "Female", locale: "en-GB" },
];

const ALL_VOICES = [...VIETNAMESE_VOICES, ...ENGLISH_VOICES];
const VALID_VOICE_IDS = new Set(ALL_VOICES.map((v) => v.value));

const DEFAULT_FALLBACK_VOICE = "vi-VN-HoaiMyNeural";
const EN_US_FALLBACK_VOICE = "en-US-GuyNeural";
const EN_GB_FALLBACK_VOICE = "en-GB-RyanNeural";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getFallbackVoice(requestedVoice: string): string {
  const matchedVoice = ALL_VOICES.find((v) => v.value === requestedVoice);
  const locale = matchedVoice?.locale ?? requestedVoice.split("-").slice(0, 2).join("-");

  if (locale === "en-GB") return EN_GB_FALLBACK_VOICE;
  if (locale.startsWith("en-")) return EN_US_FALLBACK_VOICE;
  return DEFAULT_FALLBACK_VOICE;
}

/**
 * Kiểm tra voice ID có hợp lệ trong Edge TTS không.
 * Nếu không hợp lệ (ví dụ "Kore" là Gemini voice), trả về fallback ngay.
 */
function resolveVoiceId(voice: string): { voice: string; wasInvalid: boolean } {
  if (VALID_VOICE_IDS.has(voice)) {
    return { voice, wasInvalid: false };
  }
  // Voice không nằm trong danh sách Edge TTS → dùng fallback
  console.warn(`[TTS] Voice '${voice}' không hợp lệ cho Edge TTS, chuyển sang fallback.`);
  return { voice: getFallbackVoice(voice), wasInvalid: true };
}

/**
 * Gọi Edge TTS với retry logic.
 * Microsoft TTS đôi khi trả "NoAudioReceived" do server tạm lỗi.
 */
async function synthesizeWithRetry(text: string, voice: string, rate: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const communicate = new Communicate(text, { voice, rate });
      const audioChunks: Buffer[] = [];

      for await (const chunk of communicate.stream()) {
        if (chunk.type === "audio" && chunk.data) {
          audioChunks.push(chunk.data);
        }
      }

      const audioBuffer = Buffer.concat(audioChunks);
      if (!audioBuffer.length) {
        throw new Error("No audio data generated");
      }
      return audioBuffer.toString("base64");
    } catch (error: any) {
      lastError = error;
      const isRetryable =
        error.message?.includes("NoAudioReceived") ||
        error.message?.includes("No audio") ||
        error.message?.includes("WebSocket") ||
        error.message?.includes("ECONNRESET") ||
        error.message?.includes("ETIMEDOUT");

      if (isRetryable && attempt < MAX_RETRIES) {
        const delayMs = RETRY_DELAY_MS * attempt;
        console.log(`[TTS] Lần thử ${attempt}/${MAX_RETRIES} thất bại (${error.message}). Thử lại sau ${delayMs}ms...`);
        await sleep(delayMs);
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("TTS failed after max retries");
}

// ─── GET /api/tts/voices — Lấy danh sách giọng ───
app.get("/api/tts/voices", (_req, res) => {
  res.json({ voices: ALL_VOICES });
});

// ─── GET /api/tts/health — Kiểm tra sức khỏe Edge TTS ───
app.get("/api/tts/health", async (_req, res) => {
  try {
    const testText = "Test.";
    const audio = await synthesizeWithRetry(testText, DEFAULT_FALLBACK_VOICE, "+0%");
    res.json({
      status: "ok",
      voice: DEFAULT_FALLBACK_VOICE,
      audioSize: audio.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: "error",
      message: error.message,
      hint: "Microsoft Edge TTS server có thể đang tạm lỗi. Thử lại sau vài phút.",
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── POST /api/tts — Tạo audio từ text ───
app.post("/api/tts", async (req, res) => {
  const { text, voice: rawVoice = DEFAULT_FALLBACK_VOICE, rate = "+0%" } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Thiếu nội dung text" });
    return;
  }

  const cleanText = text.trim();

  // Bước 1: Validate voice ID (chặn voice Gemini như "Kore", "Puck"...)
  const { voice: validatedVoice, wasInvalid } = resolveVoiceId(rawVoice);

  try {
    let audio = "";
    let resolvedVoice = validatedVoice;
    let fallbackApplied = wasInvalid;

    try {
      audio = await synthesizeWithRetry(cleanText, validatedVoice, rate);
    } catch (primaryError: any) {
      // Voice chính (hoặc đã validate) vẫn lỗi → thử fallback locale-aware
      const fallbackVoice = getFallbackVoice(validatedVoice);

      // Tránh retry cùng voice
      if (fallbackVoice !== validatedVoice) {
        console.warn(`[TTS] Voice '${validatedVoice}' failed, fallback to '${fallbackVoice}'`, primaryError?.message);
        resolvedVoice = fallbackVoice;
        fallbackApplied = true;

        try {
          audio = await synthesizeWithRetry(cleanText, fallbackVoice, rate);
        } catch (fallbackError: any) {
          // Fallback cũng lỗi → Microsoft TTS server đang sập
          throw new Error(
            `Cả giọng chính (${validatedVoice}) và dự phòng (${fallbackVoice}) đều lỗi. ` +
            `Microsoft Edge TTS server có thể đang gián đoạn. Chi tiết: ${fallbackError.message}`
          );
        }
      } else {
        throw primaryError;
      }
    }

    res.json({
      audio,
      mimeType: "audio/mp3",
      voice: rawVoice,
      resolvedVoice,
      fallbackApplied,
      textLength: cleanText.length,
    });
  } catch (error: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Error: ${error.message}\nStack: ${error.stack}\nRequest Body: voice=${rawVoice}, textLength=${cleanText.length}\n---\n`;
    fs.appendFileSync("tts_error.txt", logMessage);

    console.error("[TTS] ❌ Final Error:", error.message);
    res.status(500).json({
      error: "Không thể tạo audio. Microsoft Edge TTS server có thể đang tạm lỗi.",
      details: error.message,
      hint: "Thử lại sau 1-2 phút, hoặc đổi giọng khác.",
    });
  }
});

// ─── Start server ───
app.listen(PORT, () => {
  console.log(`🎙️  Edge TTS Backend đang chạy tại http://localhost:${PORT}`);
  console.log(`📋 Voices: ${ALL_VOICES.length} giọng sẵn sàng`);
  console.log(`📡 Endpoint: POST /api/tts | GET /api/tts/voices | GET /api/tts/health`);
});

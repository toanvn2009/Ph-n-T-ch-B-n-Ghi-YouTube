import express from "express";
import cors from "cors";
import fs from "fs";
import { Communicate } from "edge-tts-universal";
import { VIETNAMESE_VOICES, ENGLISH_VOICES, VOICES } from "../constants";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ─── Voice data từ constants.ts (Single Source of Truth) ───
const ALL_VOICES = VOICES;
const VALID_VOICE_IDS = new Set<string>(ALL_VOICES.map((v) => v.value));

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
 * Validate voice ID — chặn voice không thuộc Edge TTS (ví dụ Gemini "Kore").
 */
function resolveVoiceId(voice: string): { voice: string; wasInvalid: boolean } {
  if (VALID_VOICE_IDS.has(voice)) {
    return { voice, wasInvalid: false };
  }
  console.warn(`[TTS] Voice '${voice}' không hợp lệ cho Edge TTS, chuyển sang fallback.`);
  return { voice: getFallbackVoice(voice), wasInvalid: true };
}

/**
 * Gọi Edge TTS với retry logic (3 lần, delay tăng dần).
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

// ─── GET /api/tts/voices ───
app.get("/api/tts/voices", (_req, res) => {
  res.json({ voices: ALL_VOICES });
});

// ─── GET /api/tts/health ───
app.get("/api/tts/health", async (_req, res) => {
  try {
    const audio = await synthesizeWithRetry("Test.", DEFAULT_FALLBACK_VOICE, "+0%");
    res.json({ status: "ok", voice: DEFAULT_FALLBACK_VOICE, audioSize: audio.length, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({ status: "error", message: error.message, hint: "Microsoft Edge TTS server có thể đang tạm lỗi.", timestamp: new Date().toISOString() });
  }
});

// ─── POST /api/tts ───
app.post("/api/tts", async (req, res) => {
  const { text, voice: rawVoice = DEFAULT_FALLBACK_VOICE, rate = "+0%" } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Thiếu nội dung text" });
    return;
  }

  const cleanText = text.trim();
  const { voice: validatedVoice, wasInvalid } = resolveVoiceId(rawVoice);

  try {
    let audio = "";
    let resolvedVoice = validatedVoice;
    let fallbackApplied = wasInvalid;

    try {
      audio = await synthesizeWithRetry(cleanText, validatedVoice, rate);
    } catch (primaryError: any) {
      const fallbackVoice = getFallbackVoice(validatedVoice);

      if (fallbackVoice !== validatedVoice) {
        console.warn(`[TTS] Voice '${validatedVoice}' failed, fallback to '${fallbackVoice}'`, primaryError?.message);
        resolvedVoice = fallbackVoice;
        fallbackApplied = true;

        try {
          audio = await synthesizeWithRetry(cleanText, fallbackVoice, rate);
        } catch (fallbackError: any) {
          throw new Error(
            `Cả giọng chính (${validatedVoice}) và dự phòng (${fallbackVoice}) đều lỗi. ` +
            `Microsoft Edge TTS server có thể đang gián đoạn. Chi tiết: ${fallbackError.message}`
          );
        }
      } else {
        throw primaryError;
      }
    }

    res.json({ audio, mimeType: "audio/mp3", voice: rawVoice, resolvedVoice, fallbackApplied, textLength: cleanText.length });
  } catch (error: any) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] Error: ${error.message}\nVoice: ${rawVoice}, TextLength: ${cleanText.length}\n---\n`;
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
  console.log(`📋 Voices: ${ALL_VOICES.length} giọng sẵn sàng (imported from constants.ts)`);
  console.log(`📡 Endpoint: POST /api/tts | GET /api/tts/voices | GET /api/tts/health`);
});

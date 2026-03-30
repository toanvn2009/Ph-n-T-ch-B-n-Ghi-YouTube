import express from "express";
import cors from "cors";
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
  // Multilingual (đọc tiếng Việt chuẩn)
  { value: "en-US-AndrewMultilingualNeural", label: "Andrew (Nam, Tự tin)", gender: "Male", locale: "vi-VN" },
  { value: "en-US-BrianMultilingualNeural", label: "Brian (Nam, Điềm đạm)", gender: "Male", locale: "vi-VN" },
  { value: "en-US-EmmaMultilingualNeural", label: "Emma (Nữ, Biểu cảm)", gender: "Female", locale: "vi-VN" },
];

const ENGLISH_VOICES = [
  { value: "en-US-GuyNeural", label: "Guy (Nam, Storytelling)", gender: "Male", locale: "en-US" },
  { value: "en-US-SteffanNeural", label: "Steffan (Nam, Podcast)", gender: "Male", locale: "en-US" },
  { value: "en-US-ChristopherNeural", label: "Christopher (Nam, Professional)", gender: "Male", locale: "en-US" },
  { value: "en-US-EricNeural", label: "Eric (Nam, Modern)", gender: "Male", locale: "en-US" },
  { value: "en-US-JennyNeural", label: "Jenny (Nữ, US)", gender: "Female", locale: "en-US" },
  { value: "en-GB-RyanNeural", label: "Ryan (Nam, UK)", gender: "Male", locale: "en-GB" },
];

const ALL_VOICES = [...VIETNAMESE_VOICES, ...ENGLISH_VOICES];
const DEFAULT_FALLBACK_VOICE = "vi-VN-HoaiMyNeural";

async function synthesizeToBase64(text: string, voice: string, rate: string): Promise<string> {
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
}

// ─── GET /api/tts/voices — Lấy danh sách giọng ───
app.get("/api/tts/voices", (_req, res) => {
  res.json({ voices: ALL_VOICES });
});

// ─── POST /api/tts — Tạo audio từ text ───
app.post("/api/tts", async (req, res) => {
  const { text, voice = DEFAULT_FALLBACK_VOICE, rate = "+0%" } = req.body;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "Thiếu nội dung text" });
    return;
  }

  const cleanText = text.trim();

  try {
    let audio = "";
    let resolvedVoice = voice;
    let fallbackApplied = false;

    try {
      audio = await synthesizeToBase64(cleanText, voice, rate);
    } catch (primaryError: any) {
      console.warn(`[TTS] Voice '${voice}' failed, fallback to '${DEFAULT_FALLBACK_VOICE}'`, primaryError?.message);
      resolvedVoice = DEFAULT_FALLBACK_VOICE;
      fallbackApplied = true;
      audio = await synthesizeToBase64(cleanText, DEFAULT_FALLBACK_VOICE, rate);
    }

    res.json({
      audio,
      mimeType: "audio/mp3",
      voice,
      resolvedVoice,
      fallbackApplied,
      textLength: cleanText.length,
    });
  } catch (error: any) {
    console.error("Edge TTS Error:", error);
    res.status(500).json({
      error: "Không thể tạo audio. Vui lòng thử lại.",
      details: error.message,
    });
  }
});

// ─── Start server ───
app.listen(PORT, () => {
  console.log(`🎙️  Edge TTS Backend đang chạy tại http://localhost:${PORT}`);
  console.log(`📋 Voices: ${ALL_VOICES.length} giọng sẵn sàng`);
  console.log(`📡 Endpoint: POST /api/tts | GET /api/tts/voices`);
});

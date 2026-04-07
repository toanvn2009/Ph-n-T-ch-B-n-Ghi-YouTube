/**
 * Edge TTS Service — Gọi backend /api/tts để tạo audio MP3
 * Thay thế generateSpeech() của Gemini TTS
 */

const TTS_API_URL = "/api/tts";

/**
 * Convert playback speed (number) sang Edge TTS rate format string
 * Ví dụ: 1.1 → "+10%", 0.75 → "-25%", 1 → "+0%"
 */
function speedToRate(speed: number): string {
  const percent = Math.round((speed - 1) * 100);
  return percent >= 0 ? `+${percent}%` : `${percent}%`;
}

/**
 * Gọi Edge TTS backend để tạo audio MP3 từ text
 * @returns base64 string của MP3 audio
 */
export async function generateSpeechEdge(
  text: string,
  voice: string,
  speed: number = 1
): Promise<string> {
  const response = await fetch(TTS_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice,
      rate: speedToRate(speed),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Lỗi server" }));
    const hint = error.hint ? ` (${error.hint})` : "";
    throw new Error((error.error || `TTS Server lỗi: ${response.status}`) + hint);
  }

  const data = await response.json();
  return data.audio; // base64 MP3
}

/**
 * Lấy danh sách giọng từ backend
 */
export async function fetchVoices(): Promise<
  Array<{ value: string; label: string; gender: string; locale: string }>
> {
  const response = await fetch("/api/tts/voices");
  if (!response.ok) throw new Error("Không thể lấy danh sách giọng");
  const data = await response.json();
  return data.voices;
}

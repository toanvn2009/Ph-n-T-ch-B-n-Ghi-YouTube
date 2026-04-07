━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 HANDOVER DOCUMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Đang làm: Dự án Phân Tích & Sáng Tác Kịch Bản YouTube
🔢 Đến bước: Hoàn thành Phase Infra & TTS Resilience

✅ ĐÃ XONG:
   - Fixed 500 Internal Server Error (Edge TTS backend) ✓
   - Added Retry Logic (3-try backoff) for TTS ✓
   - Added Voice Validation layer (Auto-fallback for invalid voices like Kore/Puck) ✓
   - Updated .env.local with correct 9router (OpenClaw) credentials ✓
   - Enhanced frontend error reporting to show server hints ✓

⏳ CÒN LẠI:
   - FIX: Prompt `generateScriptMetadata` and `generateScript` in `geminiService.ts` — currently missing 5 creative parameters.
   - Task: Migrate audio payload to IndexedDB (prevent localStorage size limits).
   - Task: Reduce bundle size (>500k).

🔧 QUYẾT ĐỊNH QUAN TRỌNG:
   - Backend TTS (port 3001) giờ là lớp an toàn cho mọi yêu cầu audio, không để lọt voice ID sai.
   - Dùng 9router `combo-tw4` làm model mặc định để cân bằng chi phí và tốc độ.

⚠️ LƯU Ý CHO SESSION SAU:
   - File `server/tts.ts` đã ổn định, focus sửa `services/geminiService.ts` lỗi thiếu prompt tiếp theo.
   - Kiểm tra file `tts_error.txt` nếu Microsoft TTS sập trở lại.

📁 FILES QUAN TRỌNG:
   - server/tts.ts (Core TTS)
   - services/geminiService.ts (Gemini Prompt/API)
   - services/edgeTtsService.ts (Frontend API caller)
   - .brain/brain.json & .brain/session.json

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Đã lưu kiến thức! Để tiếp tục: Gõ /recap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

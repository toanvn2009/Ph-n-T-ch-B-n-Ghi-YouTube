━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 HANDOVER DOCUMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Đang làm: Dự án Phân Tích & Sáng Tác Kịch Bản YouTube
🔢 Đến bước: Hoàn thành Video Segmentation Translation + Script Processing Cross-Project Sync
📅 Cập nhật: 2026-05-01 10:45 +07

✅ ĐÃ XONG TRONG PHIÊN NÀY (01/05/2026):
   - **Translate videoSegmentation**: Khi bấm "Dịch", AI dịch luôn text fields trong videoSegmentation (title, content, mood, shots[].description) ✓
   - **sanitizeAnalysisResult preserve videoSegmentation**: Trước đây bị strip mất khi dịch vì field không đưa vào return object → giờ gọi sanitizeSegmentation ✓
   - **translateResult prompt enhanced**: Thêm rule dịch nested videoSegmentation cụ thể, giữ nguyên numeric/timestamp ✓
   - **ResultDisplay.tsx render translated segmentation**: Block "PHÂN TÍCH PHÂN CẢNH VIDEO (Đã dịch)" xanh lá, mirror UI gốc ✓

✅ ĐÃ XONG TRONG PHIÊN TRƯỚC (30/04/2026):
   - Thêm types `VideoShot` / `VideoSegment` / `VideoSegmentation` (`types.ts`) ✓
   - Implement `analyzeVideoSegmentation()` trong `services/geminiService.ts` (gọi qua 9router với file base64) ✓
   - UI section emerald gradient "PHÂN TÍCH PHÂN CẢNH VIDEO" trong `components/ResultDisplay.tsx` với `<details>` collapsible ✓
   - Nút "Phân Tích Phân Cảnh" riêng (manual trigger để tiết kiệm token) ✓
   - Copy button format plain text đẹp có thứ tự, segment title viết hoa qua `.toUpperCase()` ✓
   - State `videoSegmentation` + handler `handleAnalyzeSegmentation` trong `App.tsx` ✓

🧪 ĐÃ THỬ NGHIỆM RỒI REVERT:
   - Tab "Link YouTube" với Gemini SDK native (`fileData.fileUri`)
   - Lý do revert: 9router (OpenAI protocol) không support fileData.fileUri → phải config thêm GEMINI_API_KEY → user không muốn
   - Hiện dự án CHỈ giữ 2 tab: Text + File upload

⏳ CÒN LẠI (PENDING):
   - **HIGH**: Migrate audio payload sang IndexedDB end-to-end (`audioStorageService.ts` đã có sẵn).
   - **MEDIUM**: Reduce bundle size (>500k warning) qua code-splitting/manual chunks.
   - **LOW**: Persist `videoSegmentation` vào `SavedAnalysis` history (hiện chỉ giữ trong working state, F5 ok nhưng load history mất).

🔧 QUYẾT ĐỊNH QUAN TRỌNG:
   - Phân Tích Phân Cảnh Video dùng nút trigger thủ công → tránh tốn ~50K token mỗi lần analyze chính.
   - Title segment uppercase bằng `.toUpperCase()` JS chứ không chỉ CSS — để copy ra clipboard cũng là chữ hoa thật.
   - Bỏ tab YouTube URL — user ưu tiên đơn giản, dùng combo-tw4 cho cả text + file upload.
   - **translateResult KHÔNG dựa vào AI tự dịch nested object** — phải prompt cụ thể từng field + giữ nguyên structure numeric.
   - **sanitizeAnalysisResult PHẢI gọi sanitizeSegmentation** để preserve videoSegmentation khi normalize translated result.

⚠️ LƯU Ý CHO SESSION SAU:
   - Nếu user yêu cầu lại "phân tích từ link YouTube" → nhắc rằng phải config thêm `GEMINI_API_KEY` riêng (không thể qua 9router).
   - Khi user load analysis cũ từ history, `videoSegmentation` sẽ KHÔNG có (chưa persist) → cần bấm "Phân Tích Phân Cảnh" lại nếu muốn xem.
   - File `tts_error.txt` vẫn là nơi log lỗi Microsoft Edge TTS nếu sập trở lại.
   - **Test translation**: Upload video → analyze → "Phân Tích Phân Cảnh" → "Dịch" sang Tiếng Anh → scroll xuống → phải thấy block "PHÂN TÍCH PHÂN CẢNH VIDEO (Đã dịch)" xanh lá.

📁 FILES QUAN TRỌNG:
   - `types.ts` (VideoSegmentation types)
   - `services/geminiService.ts` (analyzeTranscript, analyzeVideoSegmentation, translateResult)
   - `components/ResultDisplay.tsx` (UI segmentation + translated segmentation block + copy formatter)
   - `App.tsx` (state + handler)
   - `server/tts.ts` (Core TTS — đã ổn định)
   - `.brain/brain.json` & `.brain/session.json`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Đã lưu kiến thức! Để tiếp tục: Gõ /recap
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Changelog

## [2026-04-07] - Infrastructure Stabilization & TTS Resilience Tuning

### Added

- **9router API Key Authentication**: Cấu hình `OPENAI_API_KEY` (key openclaw), `OPENAI_BASE_URL` (/v1 proxy 20128) và `OPENAI_MODEL` (`combo-tw4`) vào `.env.local` để ổn định hóa kết nối qua 9router.
- **Retry Logic (TTS Backend)**: Tự động thử lại 3 lần (với delay 2s, 4s, 6s) khi gặp lỗi `NoAudioReceived` từ Microsoft Edge TTS server.
- **Voice Validation (TTS Backend)**: Thêm hàm `resolveVoiceId()` để kiểm tra voice ID hợp lệ. Tự động chuyển hướng các giọng lạ (như giọng Gemini `Kore`, `Puck`) sang giọng fallback an toàn của Edge TTS thay vì bị crash server.
- **Health Check Endpoint**: Thêm `/api/tts/health` để kiểm tra nhanh tình trạng kết nối tới dịch vụ Microsoft TTS.
- **File-based Error Logging**: Backend TTS giờ đây ghi chi tiết lỗi vào `tts_error.txt` giúp chẩn đoán sự cố mạng/proxy nhanh hơn.

### Changed

- **Frontend Error Hints**: `services/edgeTtsService.ts` giờ đây hiển thị thông tin chi tiết hơn từ server (ví dụ: gợi ý đổi giọng hoặc chờ 1-2 phút) khi gặp sự cố TTS.

### Fixed

- Lỗi 500 (Internal Server Error) khi chọn nhầm các giọng cũ hoặc khi server Microsoft tạm thời gián đoạn.
- Lỗi xác thực 9router (401/502) do cấu hình key mặc định `sk_9router` không đủ quyền.

## [2026-03-31] - TTS Voice Strategy & UX Optimization

### Added

- **Gắn Tag Mục Đích (Purpose Tags)**: Thêm tag `[Learning]`, `[Podcast]`, `[News]`, `[YouTube]` trực tiếp vào label UI để người dùng chọn nhanh.
- **Tùy biến Nghe Thử (Personalized Preview)**: Mỗi voice đều có 1 câu nghe thử riêng biệt trong `hooks/useAudioPlayer.ts`, đúng ngôn ngữ (EN/VI) và đúng ngữ cảnh của giọng đó.

### Changed

- **Cơ chế Fallback Locale-Aware**: Nâng cấp backend `server/tts.ts` để fallback thông minh (EN-US về Guy, EN-GB về Ryan) thay vì mặc định luôn về Hoài My.
- **Dọn sạch Voice List**: Xóa giọng `Davis` do không ổn định và lỗi fallback về Việt Nam.

### Fixed

- Lỗi trùng lặp dòng cấu hình `en-US-SteffanNeural` trong danh sách voice.
- Lỗi English voice bị đọc bằng giọng tiếng Việt khi gặp sự cố backend.

## [2026-03-30] - Multilingual Validation, Fallback Cleanup & Stability Hardening

### Added

- Script kiểm tra thực tế voice multilingual tiếng Việt:
  - `tmp_multilingual_vn_test.ts`
  - `tmp_check_multilingual_fallback.ts`
- Scripts test trong `package.json`:
  - `test:voices`, `test:voices:multi`, `test:voices:en`, `test:smoke`

### Changed

- `App.tsx`: giới hạn và làm an toàn lưu lịch sử để giảm nguy cơ `QuotaExceededError`.
- `hooks/useAudioPlayer.ts`: áp dụng giới hạn cache audio/preview và chuẩn hóa setter cache.
- `server/tts.ts` + `constants.ts`: chỉ giữ voice multilingual pass test thực tế (`Andrew`, `Brian`, `Emma`, `Ava`), loại nhóm fallback ngầm.

### Fixed

- Sửa hiện tượng voice multilingual nghe trùng Hoài My do backend fallback âm thầm.

## [2026-03-28] - Optimized Voice List & Startup Command

### Added

- **Cấu hình giọng đọc Podcast chuyên sâu**:
  - Thêm 4 giọng nam tiếng Anh cao cấp: `Guy` (Narrator), `Steffan` (Storyteller), `Christopher` (Deep), `Eric` (Natural).
  - Loại bỏ các giọng Multilingual bị Microsoft hạn chế (`Jenny`, `Ryan`, `Xiaoxiao`).
- **Tùy chọn tốc độ tự nhiên**:
  - Bổ sung `0.9x` và `0.95x` giúp người dùng chỉnh tốc độ chậm nhưng vẫn giữ được ngữ điệu tự nhiên.

### Changed

- **Hệ thống hóa lệnh khởi động** (`package.json`):
  - Gộp `dev` và `tts` thành lệnh duy nhất: `npm start`.
  - Thêm `start:all` để chạy cả Frontend, Backend TTS và 9router (nếu cần).
- Đồng bộ hóa danh sách giọng giữa Frontend và Backend TTS.

## [2026-03-28] - Edge TTS Migration & Audio Player Overhaul

### Added

- **Backend TTS Server** (`server/tts.ts`):
  - Express server chạy trên port 3001.
  - Tích hợp `edge-tts-universal` (miễn phí, giọng Việt tự nhiên).
  - Cơ chế **Fallback tự động**: Tự chuyển sang giọng Hoài My nếu giọng yêu cầu bị lỗi.
- **Frontend TTS Service** (`services/edgeTtsService.ts`):
  - Interface gọi API nội bộ, xử lý logic chuyển đổi tốc độ (Speed → Microsoft Rate).
- **Giao diện Audio Player chuyên nghiệp**:
  - **Thanh tiến trình (Progress Bar)** gradient tương tác.
  - Tính năng **Tua nhạc (Seek)** bằng cách nhấn vào thanh tiến trình.
  - Hiển thị thời gian thực (currentTime) và tổng thời lượng (duration).
  - Nút **Stop** dừng hẳn và reset player.

### Changed

- `hooks/useAudioPlayer.ts`: Cập nhật logic từ PCM (Gemini) sang MP3 (Edge), quản lý timer cập nhật UI.
- `ScriptWriter.tsx`: Thiết kế lại khu vực Bản thu để hiển thị player đầy đủ tính năng.
- `constants.ts`: Thay đổi danh sách 10 giọng Gemini sang 7+ giọng Edge TTS (Việt/Anh).
- `vite.config.ts`: Proxy thêm `/api/tts` → `http://localhost:3001`.
- `package.json`: Thêm các scripts (`tts`, `start`) và dependencies (`express`, `cors`, `edge-tts-universal`).

### Fixed

- Lỗi trùng cổng 3000 khi khởi động server.
- Lỗi audio bị treo khi chuyển đổi giữa các tab.

## [2026-03-17] - Hybrid 9router Integration

### Added

- `services/openaiRouterService.ts`:
  - OpenAI-compatible client cho 9router
  - retry logic cho lỗi `429/502/503`
  - helper `generateRouterText` và `generateRouterJson` với parse JSON an toàn
- Script mới trong `package.json`:
  - `npm run 9router`
  - `npm start` (chạy đồng thời Vite + 9router bằng `concurrently`)
- Dependency mới:
  - `9router`
  - `openai`
  - `concurrently`

### Changed

- `services/geminiService.ts` chuyển sang mô hình **hybrid**:
  - text/JSON generation dùng 9router
  - Gemini SDK giữ lại cho TTS và fallback phân tích file
- Sửa prompt `generateScript` để thực sự dùng đầy đủ cấu hình:
  - `plotTwist`
  - `characterArchetype`
  - `focus`
  - `targetAudience`
  - `pacing`
- `vite.config.ts` thêm proxy `/v1 -> http://localhost:20128` và các env define:
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_MODEL`
- `README.md` cập nhật hướng dẫn chạy theo luồng hybrid 9router + Gemini TTS

### Notes

- TTS vẫn dùng Gemini (`gemini-2.5-flash-preview-tts`) để đảm bảo chất lượng giọng đọc hiện tại.

## [2026-02-13] - Major Refactoring & Improvements

### Added

- `ErrorBoundary.tsx` — React Error Boundary bọc toàn bộ App (H1)
- `beforeunload` event listener trong `App.tsx` chống mất dữ liệu (H2)
- SEO meta tags: description, theme-color, Open Graph, Twitter Card (M1)
- `index.css` với `@import "tailwindcss"` + custom animations
- `@types/react`, `@types/react-dom` cho React 19 type support
- Khởi tạo hệ thống bộ nhớ `.brain/` cho dự án

### Changed

- **Refactored `ScriptWriter.tsx`** từ 1040 → ~500 dòng (C1):
  - Tách `constants.ts` — shared constants cho dropdown options
  - Tách `utils/audioUtils.ts` — base64, PCM, WAV, TTS split
  - Tách `hooks/useAudioPlayer.ts` — AudioContext, playback, preview, caching
- `ResultDisplay.tsx` — import `STYLE_LABELS/TONE_LABELS` từ shared constants (H4)
- `index.html` — `lang="vi"`, loại bỏ Tailwind CDN script
- `vite.config.ts` — thêm `@tailwindcss/vite` plugin (M2)
- `tsconfig.json` — giữ `useDefineForClassFields: false`

### Known Issues

- `services/geminiService.ts` prompt `generateScript` chỉ dùng `style` + `tone`, bỏ qua 5 params khác

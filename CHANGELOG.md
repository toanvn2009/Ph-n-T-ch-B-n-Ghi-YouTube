# Changelog

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

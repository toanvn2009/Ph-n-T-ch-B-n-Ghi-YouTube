# Changelog

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

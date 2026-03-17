# Changelog

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


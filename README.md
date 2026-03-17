<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Phân Tích Bản Ghi YouTube (Hybrid 9router + Gemini TTS)

Ứng dụng hỗ trợ phân tích transcript YouTube, tạo kịch bản nhiều phần, dịch nội dung, và tạo giọng đọc AI.

## Kiến trúc AI hiện tại

- **9router (OpenAI-compatible)** cho:
  - phân tích transcript text
  - dịch kết quả
  - sinh metadata và kịch bản
  - dịch kịch bản
- **Gemini SDK** giữ lại cho:
  - TTS (`gemini-2.5-flash-preview-tts`)
  - fallback phân tích khi đầu vào là file nhị phân

## Chạy local

### Yêu cầu
- Node.js 20+
- 9router khả dụng local (app sẽ gọi qua `/v1` proxy)

### Cài đặt
```bash
npm install
```

### Biến môi trường khuyến nghị (`.env.local`)
```bash
# Dùng cho phần Gemini TTS + fallback
GEMINI_API_KEY=your_gemini_api_key

# Dùng cho 9router
OPENAI_API_KEY=sk_9router
OPENAI_BASE_URL=/v1
OPENAI_MODEL=combo-tw4
```

### Chạy app
- Chạy frontend + 9router cùng lúc:
```bash
npm start
```

- Hoặc chạy riêng:
```bash
npm run dev
npm run 9router
```

## Endpoint nội bộ
- Frontend gọi: `/v1/...`
- Vite proxy chuyển tiếp tới: `http://localhost:20128`

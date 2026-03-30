<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Phân Tích Bản Ghi YouTube (Edge TTS + 9router)

Ứng dụng hỗ trợ phân tích transcript YouTube, tạo kịch bản nhiều phần chuyên sâu, dịch nội dung, và tạo giọng đọc AI Podcast chất lượng cao.

## Kiến trúc AI hiện tại

- **Edge TTS (Backend Express)** cho:
  - Tạo giọng đọc AI thực tế, tốc độ cao, miễn phí.
  - Hỗ trợ giọng Việt (Hoài My, Nam Minh) và giọng Anh Podcast (Guy, Steffan, Christopher, Eric).
  - Tự động Fallback khi một giọng nói gặp lỗi từ nhà cung cấp.
- **9router (OpenAI-compatible)** cho:
  - Phân tích transcript text, sinh metadata.
  - Sáng tác kịch bản kịch tính (với plot twists, archetypes, focus).
  - Dịch đa ngôn ngữ kết quả và kịch bản.

## Chạy local

### Yêu cầu

- Node.js 20+
- (Tùy chọn) 9router cài sẵn trên máy nếu muốn dùng AI Gateway.

### Cài đặt

```bash
npm install
```

### Biến môi trường (`.env.local`)

```bash
# Dùng cho các task yêu cầu Gemini gốc
GEMINI_API_KEY=your_gemini_api_key

# Dùng cho 9router
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=http://localhost:20128/v1
OPENAI_MODEL=gemini-2.0-flash
```

### Chạy hệ thống

- **Nhanh nhất (Frontend + TTS Backend):**

```bash
npm start
```

- **Đầy đủ nhất (Frontend + TTS + 9router):**

```bash
npm run start:all
```

- **Chạy lẻ:**

```bash
npm run dev      # Frontend (Port 3000)
npm run tts      # Backend TTS (Port 3001)
npm run 9router  # AI Gateway (Port 20128)
```

## Cấu trúc Endpoint

- `/api/tts` → Proxy sang `http://localhost:3001` (Edge TTS)
- `/v1` → Proxy sang `http://localhost:20128` (9router)

---

_Lưu ý: Luôn đảm bảo cổng 3000, 3001 và 20128 không bị chiếm dụng trước khi khởi chạy._

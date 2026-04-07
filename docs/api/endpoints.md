# API Documentation - Edge TTS

Hệ thống sử dụng Edge TTS thông qua một backend Express riêng biệt để tránh giới hạn của trình duyệt và tiết kiệm chi phí/token.

---

## 🎙️ TTS Service

Dịch vụ chuyển đổi văn bản thành giọng nói dùng thư viện `edge-tts-universal`.

### GET /api/tts/voices

Lấy danh sách các giọng đọc được hỗ trợ (đã gắn tag mục đích như `[Learning]`, `[Podcast]`, `[News]`, `[YouTube]`).

**Response (200):**

```json
{
  "voices": [
    {
      "value": "vi-VN-HoaiMyNeural",
      "label": "Hoài My (Nữ, Dịu dàng)",
      "gender": "Female",
      "locale": "vi-VN"
    },
    {
      "value": "en-US-GuyNeural",
      "label": "Guy (Nam, Storytelling) [YouTube][News]",
      "gender": "Male",
      "locale": "en-US"
    },
    {
      "value": "en-GB-RyanNeural",
      "label": "Ryan (Nam, UK) [Podcast]",
      "gender": "Male",
      "locale": "en-GB"
    }
  ]
}
```

---

### POST /api/tts

Tạo audio từ văn bản.

**Request Body:**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `text` | string | Yes | Nội dung cần đọc. |
| `voice` | string | No | Tên giọng đọc (Default: `vi-VN-HoaiMyNeural`). |
| `rate` | string | No | Tốc độ đọc (Định dạng: `+X%` hoặc `-X%`, Default: `+0%`). |

**Example Request:**

```json
{
  "text": "Chào mừng bạn đến với kênh của tôi.",
  "voice": "vi-VN-NamMinhNeural",
  "rate": "+10%"
}
```

**Response (200):**

```json
{
  "audio": "base64_encoded_mp3_data...",
  "mimeType": "audio/mp3",
  "voice": "vi-VN-NamMinhNeural",
  "resolvedVoice": "vi-VN-NamMinhNeural",
  "fallbackApplied": false,
  "textLength": 35
}
```

**Cơ chế Fallback:**
Nếu `voice` được yêu cầu gặp lỗi, server sẽ tự động chuyển đổi dựa trên locale:

- Giọng `en-US/*` → Dự phòng bằng `en-US-GuyNeural`.
- Giọng `en-GB/*` → Dự phòng bằng `en-GB-RyanNeural`.
- Các giọng khác → Dự phòng bằng `vi-VN-HoaiMyNeural`.
  Trả về `fallbackApplied: true` và `resolvedVoice` tương ứng.

---

## 🤖 Gemini API (Hybrid)

Các request xử lý kịch bản và phân tích vẫn sử dụng Gemini model thông qua proxy `9router` (Port 20128).

- **Endpoint:** `/v1/chat/completions`
- **Model:** `gemini-2.0-flash`

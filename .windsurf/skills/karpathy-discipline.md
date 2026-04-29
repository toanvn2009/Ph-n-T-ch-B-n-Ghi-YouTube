---
description: 4 nguyên tắc kỷ luật khi viết code cùng AI, dựa trên quan sát của Andrej Karpathy về các "bệnh" thường gặp của LLM (over-engineering, đoán mò, drive-by refactor). Use this skill before any non-trivial code change to enforce thinking, simplicity, surgical edits and verifiable goals.
---

# Karpathy Discipline — 4 Nguyên tắc khi pair với AI

> Nguồn: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)
> Triết lý: Bias toward **caution over speed** cho task non-trivial. Task đơn giản (typo, one-liner) thì dùng judgement, không cần đủ rigor.

---

## ⚠️ Các "bệnh" của LLM mà nguyên tắc này chữa

1. **Đoán ngầm** — Tự chọn 1 cách hiểu khi ambiguous, không hỏi lại
2. **Over-engineering** — Viết 1000 dòng cho việc cần 100, abstraction thừa
3. **Drive-by refactor** — Sửa code/comment không liên quan đến task
4. **Mục tiêu mơ hồ** — Không có success criteria → loop vô tận

---

## 🛡️ 4 Nguyên tắc

### 1. Think Before Coding — Nghĩ trước khi gõ
**Don't assume. Don't hide confusion. Surface tradeoffs.**

- ✅ **State assumptions explicitly** — Nếu không chắc → hỏi, không đoán
- ✅ **Present multiple interpretations** — Khi ambiguous, liệt kê các cách hiểu
- ✅ **Push back when warranted** — Nếu có cách đơn giản hơn → nói ra
- ✅ **Stop when confused** — Gọi tên cái không rõ và xin clarification

**Test:** Trước khi viết code, em đã nói rõ assumption chưa?

---

### 2. Simplicity First — Đơn giản trước
**Minimum code that solves the problem. Nothing speculative.**

- ❌ Không feature ngoài yêu cầu
- ❌ Không abstraction cho code dùng 1 lần
- ❌ Không "flexibility" / "configurability" không ai yêu cầu
- ❌ Không error handling cho scenario không thể xảy ra
- ✅ Nếu 200 dòng có thể rút thành 50 → viết lại

**Test:** Một senior engineer xem code này có nói "overcomplicated" không? Nếu có → simplify.

---

### 3. Surgical Changes — Sửa như mổ
**Touch only what you must. Clean up only your own mess.**

Khi edit code có sẵn:
- ❌ Không "improve" code/comment/format xung quanh
- ❌ Không refactor cái không bị hỏng
- ✅ Match style hiện có, dù mình muốn làm khác
- ✅ Nếu thấy dead code không liên quan → **mention**, đừng tự xoá

Khi thay đổi tạo orphan:
- ✅ Xoá import/var/function mà **chính sửa đổi của mình** làm thừa
- ❌ Không xoá pre-existing dead code trừ khi được yêu cầu

**Test:** Mỗi dòng thay đổi có truy được trực tiếp về yêu cầu của user không?

---

### 4. Goal-Driven Execution — Thực thi theo mục tiêu
**Define success criteria. Loop until verified.**

Với task multi-step, viết plan ngắn:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

**Strong success criteria** → AI tự loop độc lập.
**Weak criteria** ("làm cho nó chạy") → cần clarify liên tục.

**Test:** Anh đã có thể verify từng step bằng cách nào chưa?

---

## ✅ Dấu hiệu nguyên tắc đang work

- 📉 **Diff nhỏ hơn** — Chỉ thay đổi cái được yêu cầu
- 📉 **Ít rewrite** — Code đơn giản ngay từ lần đầu
- 💬 **Hỏi trước khi code** — Không phải sau khi sai
- 🧹 **PR sạch** — Không "drive-by improvement"

---

## 🔗 Tích hợp với AWF

Skill này **bổ sung** (không thay thế) các skill khác:
- `clean-code.md` → tập trung style/structure
- `error-handling.md` → tập trung resilience
- **`karpathy-discipline.md`** → tập trung **kỷ luật giao tiếp & scope** với AI

Áp dụng tự động khi:
- `/code` — Trước khi implement
- `/refactor` — Để tránh drive-by refactor
- `/debug` — Để tránh "fix" cái không bị hỏng

---

## 📋 Pre-flight Checklist

Trước khi bắt đầu task non-trivial:

- [ ] **Think** — Đã state rõ assumption / hỏi nếu ambiguous?
- [ ] **Simple** — Giải pháp tối thiểu cho yêu cầu, không speculative?
- [ ] **Surgical** — Mỗi line thay đổi trace về user request?
- [ ] **Goal** — Có success criteria verify được?

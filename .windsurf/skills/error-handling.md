---
description: Resilient error handling with retry, circuit breaker, and graceful degradation. Use when implementing API calls, image generation, or async operations.
---

# Error Handling Patterns

## Patterns for This Project

### 1. Exponential Backoff with Jitter (already used)
```typescript
const base = 3000 * Math.pow(2, attempt);
const jitter = Math.floor(Math.random() * 1500);
const waitMs = Math.min(base + jitter, 45000);
```

### 2. Circuit Breaker (for 9Router)
Track consecutive failures. After N failures, stop trying for a cooldown period:
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private readonly threshold = 5;
  private readonly cooldownMs = 60000;

  canAttempt(): boolean {
    if (this.failures < this.threshold) return true;
    return Date.now() - this.lastFailure > this.cooldownMs;
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();
  }

  recordSuccess(): void {
    this.failures = 0;
  }
}
```

### 3. Graceful Degradation
When image generation fails:
- Show placeholder with retry button
- Don't block other operations
- Queue failed items for batch retry

### 4. Error Classification
```typescript
type ErrorKind = 
  | 'rate_limit'     // Wait and retry
  | 'auth'           // Account issue — don't retry
  | 'safety_filter'  // Prompt issue — modify and retry
  | 'server_error'   // Transient — retry with backoff
  | 'timeout'        // Slow — retry with longer timeout
  | 'network'        // Connectivity — retry after delay

function classifyError(msg: string): ErrorKind { ... }
```

### 5. User-Facing Error Messages
```typescript
// ❌ Bad — technical jargon
throw new Error(`HTTP 502: Codex did not return an image`);

// ✅ Good — actionable message
throw new Error(`Tất cả account đang cooldown. Thử lại sau 30s.`);
```

### 6. Structured Logging
```typescript
console.log(`[Module] ✅ Action completed (${elapsed}s)`);
console.warn(`[Module] ⚠️ Retry ${attempt}/${retries} — reason`);
console.error(`[Module] ❌ Failed — ${error.message}`);
```

## Best Practices
- Address root cause, not symptoms
- Log at appropriate levels (info/warn/error)
- Include timing in logs for performance tracking
- Provide retry/recovery hints in error messages
- Don't swallow errors silently

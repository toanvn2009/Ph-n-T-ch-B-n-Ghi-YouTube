---
description: Clean Code principles by Uncle Bob. Use when writing new functions, refactoring, or reviewing code quality.
---

# Clean Code

## Key Principles for This Project

### 1. Functions — Do One Thing
```typescript
// ❌ Bad — does too many things
async function generateAndSaveAndDisplay(prompt, index) { ... }

// ✅ Good — single responsibility
async function generateImage(prompt: string): Promise<string> { ... }
function saveImageResult(index: number, url: string): void { ... }
function displayToast(message: string, type: ToastType): void { ... }
```

### 2. Meaningful Names
```typescript
// ❌ Bad
const d = Date.now() - startTime;
const r = msg.match(/reset\s+after\s+(\d+)/);

// ✅ Good
const elapsedMs = Date.now() - startTime;
const resetDelayMatch = msg.match(/reset\s+after\s+(\d+)/);
```

### 3. Functions < 20 Lines
If a function exceeds 20 lines, extract helper functions.

### 4. Max 2-3 Arguments
```typescript
// ❌ Too many args
function callRouterText(prompt, temperature, retries, timeoutMs, maxTokens) { ... }

// ✅ Options object
function callRouterText(prompt: string, options?: CallOptions) { ... }
```

### 5. No Side Effects
Functions shouldn't secretly change global state.

### 6. Error Handling
- Use Exceptions instead of return codes
- Write try-catch-finally first
- Don't return null — use typed errors

### 7. Comments
- Don't comment bad code — rewrite it
- Good: Legal, TODO, clarification of external API behavior
- Bad: Redundant, misleading, noise

## Implementation Checklist
- [ ] Is this function < 20 lines?
- [ ] Does it do exactly one thing?
- [ ] Are names intention-revealing?
- [ ] < 3 arguments?
- [ ] No hidden side effects?

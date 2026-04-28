---
description: TypeScript advanced types and strict type safety. Use when designing interfaces, fixing type errors, or hardening type safety.
---

# TypeScript Pro

## Key Patterns for This Project

### 1. Strict Interfaces
```typescript
// ❌ Loose typing
const extractWorldData = async (style: string, script: string): Promise<any>

// ✅ Strict return type
interface WorldData {
  characters: CharacterProfile[];
  locations: LocationProfile[];
  objectLock: string;
}
const extractWorldData = async (style: string, script: string): Promise<WorldData>
```

### 2. Discriminated Unions for Status
```typescript
// ❌ Separate boolean flags
interface PromptData {
  status: string;
  imageUrl?: string;
  error?: string;
}

// ✅ Discriminated union
type PromptData =
  | { status: 'idle' }
  | { status: 'generating' }
  | { status: 'success'; imageUrl: string }
  | { status: 'error'; error: string };
```

### 3. Template Literal Types for IDs
```typescript
type CharacterId = `CHARACTER_${string}`;
type LocationId = `BACKGROUND_${string}`;
```

### 4. Const Assertions for Config
```typescript
const ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4'] as const;
type AspectRatio = typeof ASPECT_RATIOS[number];
```

### 5. Generic Utility for API Calls
```typescript
async function callRouterText<T>(
  prompt: string,
  options?: { temperature?: number; retries?: number; timeoutMs?: number }
): Promise<T> { ... }
```

## Focus Areas
- Leverage strict type checking with `strict: true`
- Use generics for maximum type safety
- Prefer type inference over explicit annotations when clear
- Design robust interfaces for API responses
- Use proper error types with typed exceptions

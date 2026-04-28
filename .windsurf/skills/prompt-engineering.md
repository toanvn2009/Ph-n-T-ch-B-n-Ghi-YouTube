---
description: Expert guide on prompt engineering patterns for LLM image and text generation. Use when optimizing extractWorldData, generatePromptsFromScript, or any LLM prompt.
---

# Prompt Engineering Patterns

## Core Techniques for This Project

### 1. Chain-of-Thought (extractWorldData)
Force the model to enumerate before detailing:
```
STEP 0: List ALL character names first.
STEP 1: List ALL locations first.
STEP 2: Only THEN write detailed visual_prompt for each.
```

### 2. Few-Shot Learning (generatePromptsFromScript)
Include 1-2 example shot prompts in the system message to show exact format:
```json
{
  "scene_number": 1,
  "image_prompt": "Shot: Medium close-up...\nAction: Character walks...",
  "vi_description": "Nhân vật bước đi..."
}
```

### 3. Output Format Anchoring
- Start JSON with `{` immediately — no preamble
- End with `}` — no trailing explanation
- Use ```json code blocks in instructions to prime the model

### 4. Progressive Disclosure for Complex Prompts
```
Level 1: "Describe this character" → vague
Level 2: "Describe this character's appearance for image generation" → better
Level 3: Full template with body/face/outfit/style sections → best
```

### 5. Negative Constraints (Prevent Hallucination)
```
❌ DO NOT invent characters not in the script
❌ DO NOT add style elements not in ART STYLE
❌ DO NOT re-describe locked identities
✅ USE only ID tokens for referencing
✅ QUOTE exact phrases from the script
```

### 6. Temperature Guidelines
| Task | Temperature | Why |
|------|-------------|-----|
| extractWorldData | 0.3 | Faithful extraction, no creativity |
| analyzeStyle | 0.4 | Precise style analysis |
| generatePromptsFromScript | 0.5 | Slight creativity for shot composition |
| General chat | 0.7 | Balanced |

### 7. Token Budget Strategy
- **Long scripts**: Don't set maxTokens limit — let model use full capacity
- **JSON output**: Model tends to be verbose — use "concise" instruction
- **Visual prompts**: 100-200 words per character/location is optimal

## Best Practices
1. Be specific — vague prompts produce inconsistent results
2. Show examples — more effective than describing rules
3. Test on diverse scripts — ensure robustness
4. Iterate — small changes can have large impact
5. Version control prompts — treat as code

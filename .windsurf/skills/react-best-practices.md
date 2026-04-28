---
description: React + TypeScript performance optimization. Use when writing components, fixing re-renders, optimizing bundle size, or reviewing React code.
---

# React Best Practices (Vercel)

## Priority Rules for This Project

### CRITICAL — Eliminating Waterfalls
- **async-parallel**: Use `Promise.all()` for independent operations (e.g., generating multiple images)
- **async-defer-await**: Move await into branches where actually used
- **async-suspense-boundaries**: Use Suspense for streaming content

### CRITICAL — Bundle Size
- **bundle-barrel-imports**: Import directly, avoid barrel files
- **bundle-dynamic-imports**: Lazy-load heavy components (e.g., image preview modals)
- **bundle-defer-third-party**: Load analytics after hydration

### MEDIUM — Re-render Optimization
- **rerender-memo**: Extract expensive work into memoized components
- **rerender-derived-state**: Subscribe to derived booleans, not raw values
- **rerender-functional-setstate**: Use functional setState for stable callbacks
- **rerender-lazy-state-init**: Pass function to useState for expensive values
- **rerender-transitions**: Use startTransition for non-urgent updates

### Specific to This Project
```tsx
// ❌ Bad — causes re-render of ALL prompt cards when one changes
setGeneratedPrompts(newPrompts);

// ✅ Good — only update the specific card
setGeneratedPrompts(prev => prev.map((p, i) => 
  i === index ? { ...p, status: 'success', imageUrl } : p
));

// ❌ Bad — recreates callback every render
<button onClick={() => handleGenerate(index)}>

// ✅ Good — stable callback with useCallback
const handleGenerate = useCallback((index: number) => { ... }, [deps]);
```

### JavaScript Performance
- **js-hoist-regexp**: Move RegExp creation outside loops (in promptSanitizer)
- **js-early-exit**: Return early from functions
- **js-set-map-lookups**: Use Set/Map for O(1) lookups (character/location by ID)

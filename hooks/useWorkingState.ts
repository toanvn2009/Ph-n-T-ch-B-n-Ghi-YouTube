// Auto-persist + restore an arbitrary "working state" snapshot to localStorage.
// Khi user F5 giữa lúc đang làm việc, hook này đảm bảo state được khôi phục.

import { useEffect, useRef } from 'react';

interface UseWorkingStateOptions<T> {
    /** localStorage key to store the snapshot under. */
    storageKey: string;
    /** Current snapshot (built from React state). */
    snapshot: T;
    /** Returns true if the snapshot is "empty" → key should be removed. */
    isEmpty: boolean;
    /** Called once on mount with the persisted snapshot (if any). */
    onRestore: (saved: T) => void;
}

/**
 * Generic hook backing the "F5 không mất việc" behavior.
 * - On mount: read storageKey → call onRestore(saved) once.
 * - On every subsequent render: persist `snapshot` (or remove key if empty).
 *
 * Restoration is performed ONCE; later state changes do not re-run onRestore,
 * so callers don't accidentally re-hydrate.
 */
export function useWorkingState<T>({ storageKey, snapshot, isEmpty, onRestore }: UseWorkingStateOptions<T>) {
    const restoredRef = useRef(false);

    // Restore once on mount
    useEffect(() => {
        if (restoredRef.current) return;
        restoredRef.current = true;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        try {
            const parsed = JSON.parse(raw) as T;
            onRestore(parsed);
        } catch (e) {
            console.warn('Failed to restore working state', e);
            localStorage.removeItem(storageKey);
        }
    }, [storageKey, onRestore]);

    // Auto-persist on every snapshot change
    useEffect(() => {
        if (isEmpty) {
            localStorage.removeItem(storageKey);
            return;
        }
        try {
            localStorage.setItem(storageKey, JSON.stringify(snapshot));
        } catch (e) {
            console.warn('Failed to persist working state', e);
        }
    }, [storageKey, snapshot, isEmpty]);
}

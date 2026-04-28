// Hook quản lý danh sách SavedAnalysis trong localStorage + dọn IndexedDB audio cache khi xoá.
// Tách khỏi App.tsx để App chỉ lo state phiên làm việc hiện tại.

import { useCallback, useEffect, useState } from 'react';
import { AudioStorageService } from '../services/audioStorageService';
import type { SavedAnalysis } from '../types';

const HISTORY_STORAGE_KEY = 'yt_analyzer_history';
const MAX_HISTORY_ITEMS = 20;

/**
 * Try to write `items` to localStorage. If quota is exceeded, progressively
 * trim the list until the write succeeds. Returns true if the final write was OK.
 */
const writeWithQuotaFallback = (items: SavedAnalysis[]): { ok: boolean; persisted: SavedAnalysis[] } => {
    const normalized = items.slice(0, MAX_HISTORY_ITEMS);
    try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized));
        return { ok: true, persisted: normalized };
    } catch (error) {
        console.warn('LocalStorage quota exceeded, trimming history...', error);
        for (let keep = Math.min(normalized.length - 1, 10); keep >= 1; keep--) {
            try {
                const reduced = normalized.slice(0, keep);
                localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(reduced));
                return { ok: true, persisted: reduced };
            } catch {
                // continue trimming
            }
        }
        return { ok: false, persisted: normalized };
    }
};

export function useAnalysisHistory() {
    const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);

    // Load history once on mount
    useEffect(() => {
        const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (!saved) return;
        try {
            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return;
            setSavedAnalyses(parsed.slice(0, MAX_HISTORY_ITEMS));
        } catch (e) {
            console.error('Failed to parse history', e);
            setSavedAnalyses([]);
        }
    }, []);

    /** Prepend a new entry. Returns true if it was persisted (false → quota issue). */
    const saveAnalysis = useCallback((entry: SavedAnalysis): boolean => {
        const next = [entry, ...savedAnalyses.filter(a => a.id !== entry.id)];
        const { ok, persisted } = writeWithQuotaFallback(next);
        setSavedAnalyses(persisted);
        return ok;
    }, [savedAnalyses]);

    /** Remove an entry and cleanup its IndexedDB audio cache. */
    const deleteAnalysis = useCallback((id: string) => {
        const next = savedAnalyses.filter(item => item.id !== id);
        writeWithQuotaFallback(next);
        setSavedAnalyses(next);
        AudioStorageService.deleteScriptAudioCache(id).catch(err =>
            console.warn('Failed to cleanup audio cache for', id, err)
        );
    }, [savedAnalyses]);

    return { savedAnalyses, saveAnalysis, deleteAnalysis };
}

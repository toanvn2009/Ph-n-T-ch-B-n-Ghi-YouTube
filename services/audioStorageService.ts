// This service handles saving and retrieving audio blobs from IndexedDB
// This allows audio to persist across page reloads without re-fetching from the API.

import type { AudioVersion } from '../types';

const DB_NAME = 'YT_Script_Audio_Cache_V1';
const DB_VERSION = 2;
const STORE_NAME = 'voice_previews';
const SCRIPT_STORE = 'script_audio_cache';

interface AudioRecord {
    key: string;
    data: string; // Base64 string
    timestamp: number;
}

interface ScriptCacheRecord {
    analysisId: string;
    cache: Record<string, AudioVersion[]>;
    updatedAt: number;
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
            }
            if (!db.objectStoreNames.contains(SCRIPT_STORE)) {
                db.createObjectStore(SCRIPT_STORE, { keyPath: 'analysisId' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

export const AudioStorageService = {
    async saveAudio(key: string, base64Data: string): Promise<void> {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            
            const record: AudioRecord = {
                key,
                data: base64Data,
                timestamp: Date.now()
            };

            store.put(record);
            
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error("Failed to save audio to cache:", err);
            // Non-blocking error, we just won't cache it
        }
    },

    async getAudio(key: string): Promise<string | null> {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const record = request.result as AudioRecord | undefined;
                    resolve(record ? record.data : null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error("Failed to get audio from cache:", err);
            return null;
        }
    },

    // ============ Script Audio Cache (per-analysis) ============
    async saveScriptAudioCache(analysisId: string, cache: Record<string, AudioVersion[]>): Promise<void> {
        if (!analysisId) return;
        try {
            const db = await openDB();
            const tx = db.transaction(SCRIPT_STORE, 'readwrite');
            const store = tx.objectStore(SCRIPT_STORE);

            const record: ScriptCacheRecord = {
                analysisId,
                cache,
                updatedAt: Date.now()
            };
            store.put(record);

            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error("Failed to save script audio cache:", err);
        }
    },

    async loadScriptAudioCache(analysisId: string): Promise<Record<string, AudioVersion[]> | null> {
        if (!analysisId) return null;
        try {
            const db = await openDB();
            const tx = db.transaction(SCRIPT_STORE, 'readonly');
            const store = tx.objectStore(SCRIPT_STORE);
            const request = store.get(analysisId);

            return new Promise((resolve, reject) => {
                request.onsuccess = () => {
                    const record = request.result as ScriptCacheRecord | undefined;
                    resolve(record ? record.cache : null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.error("Failed to load script audio cache:", err);
            return null;
        }
    },

    async deleteScriptAudioCache(analysisId: string): Promise<void> {
        if (!analysisId) return;
        try {
            const db = await openDB();
            const tx = db.transaction(SCRIPT_STORE, 'readwrite');
            tx.objectStore(SCRIPT_STORE).delete(analysisId);
            return new Promise((resolve, reject) => {
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch (err) {
            console.error("Failed to delete script audio cache:", err);
        }
    }
};
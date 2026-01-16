// This service handles saving and retrieving audio blobs from IndexedDB
// This allows audio to persist across page reloads without re-fetching from the API.

const DB_NAME = 'YT_Script_Audio_Cache_V1';
const STORE_NAME = 'voice_previews';

interface AudioRecord {
    key: string;
    data: string; // Base64 string
    timestamp: number;
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'key' });
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
    }
};
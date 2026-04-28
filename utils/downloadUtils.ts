// Generic browser-side download helpers (Blob → click anchor → revoke).
// Eliminates the 3 separate copy-pasted implementations previously sprinkled
// across App.tsx, ScriptWriter.tsx and useAudioPlayer.ts.

/** Trigger a download for any Blob with the given filename. */
export const downloadBlob = (blob: Blob, filename: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/** Download an arbitrary value as a pretty-printed JSON file. */
export const downloadJson = (data: unknown, filename: string): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
};

/** Download plain text (e.g., generated script) as .txt. */
export const downloadText = (content: string, filename: string): void => {
    const blob = new Blob([content], { type: 'text/plain' });
    downloadBlob(blob, filename);
};

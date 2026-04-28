import { useState, useRef, useEffect, useCallback } from 'react';
import { generateSpeechEdge } from '../services/edgeTtsService';
import { AudioStorageService } from '../services/audioStorageService';
import { splitTextForTTS } from '../utils/audioUtils';
import { downloadBlob } from '../utils/downloadUtils';
import { VOICES, VOICE_PREVIEW_TEXTS } from '../constants';
import type { AudioVersion } from '../types';

// Helper: base64 string → ArrayBuffer
function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

// Helper: ArrayBuffer → base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

interface UseAudioPlayerOptions {
    selectedVoice: string;
    playbackSpeed: number;
    language: string;
    storyTargetLanguage: string;
    analysisId?: string;
}

const MAX_AUDIO_VERSIONS_PER_KEY = 3;
const MAX_AUDIO_CACHE_KEYS = 24;
const MAX_PREVIEW_CACHE_ITEMS = 20;

export function useAudioPlayer({ selectedVoice, playbackSpeed, language, storyTargetLanguage, analysisId }: UseAudioPlayerOptions) {
    const [audioLoadingKey, setAudioLoadingKey] = useState<string | null>(null);
    const [audioChunkStatus, setAudioChunkStatus] = useState<string>('');
    const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
    const [audioCache, setAudioCache] = useState<Record<string, AudioVersion[]>>({});
    const hydratedRef = useRef<boolean>(false);

    const [isPreviewingVoice, setIsPreviewingVoice] = useState<boolean>(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const previewCacheRef = useRef<Record<string, AudioBuffer>>({});


    const [audioOffset, setAudioOffset] = useState<number>(0);
    const [audioStartTime, setAudioStartTime] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);
    const [playbackDuration, setPlaybackDuration] = useState<number>(0);
    const timerRef = useRef<number | null>(null);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sourceNodeRef.current) sourceNodeRef.current.stop();
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    // Hydrate audioCache from IndexedDB whenever analysisId changes
    useEffect(() => {
        let cancelled = false;
        hydratedRef.current = false;

        if (!analysisId) {
            setAudioCache({});
            hydratedRef.current = true;
            return;
        }

        (async () => {
            const stored = await AudioStorageService.loadScriptAudioCache(analysisId);
            if (cancelled) return;
            setAudioCache(stored || {});
            hydratedRef.current = true;
        })();

        return () => { cancelled = true; };
    }, [analysisId]);

    // Persist audioCache to IndexedDB after hydration
    useEffect(() => {
        if (!analysisId || !hydratedRef.current) return;
        AudioStorageService.saveScriptAudioCache(analysisId, audioCache);
    }, [audioCache, analysisId]);

    // Sync playback speed to active source
    useEffect(() => {
        if (sourceNodeRef.current) sourceNodeRef.current.playbackRate.value = playbackSpeed;
    }, [playbackSpeed]);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const normalizeAudioCache = useCallback((cache: Record<string, AudioVersion[]>) => {
        const normalizedEntries = Object.entries(cache)
            .map(([key, versions]) => {
                const trimmedVersions = [...versions]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .slice(0, MAX_AUDIO_VERSIONS_PER_KEY);
                return [key, trimmedVersions] as const;
            })
            .filter(([, versions]) => versions.length > 0)
            .sort((a, b) => (b[1][0]?.createdAt || 0) - (a[1][0]?.createdAt || 0))
            .slice(0, MAX_AUDIO_CACHE_KEYS);

        return Object.fromEntries(normalizedEntries) as Record<string, AudioVersion[]>;
    }, []);

    const rememberPreviewBuffer = useCallback((cacheKey: string, buffer: AudioBuffer) => {
        previewCacheRef.current[cacheKey] = buffer;
        const keys = Object.keys(previewCacheRef.current);
        if (keys.length > MAX_PREVIEW_CACHE_ITEMS) {
            delete previewCacheRef.current[keys[0]];
        }
    }, []);

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const playAudioData = useCallback(async (
        base64Audio: string,
        versionId: string,
        speedOverride?: number,
        startFromOffset: number = 0
    ) => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null;
            sourceNodeRef.current.stop();
        }
        stopTimer();
        setAudioPlayingId(null);
        setIsPreviewPlaying(false);

        const ctx = getAudioContext();

        try {
            if (ctx.state === 'suspended') await ctx.resume();
            const mp3ArrayBuffer = base64ToArrayBuffer(base64Audio);
            const audioBuffer = await ctx.decodeAudioData(mp3ArrayBuffer.slice(0));
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            const effectiveSpeed = speedOverride || playbackSpeed;
            source.playbackRate.value = effectiveSpeed;
            source.connect(ctx.destination);

            source.onended = () => {
                stopTimer();
                setAudioPlayingId(prev => {
                    if (prev === versionId) {
                        setAudioOffset(0);
                        setCurrentTime(0);
                        return null;
                    }
                    return prev;
                });
                setIsPreviewPlaying(false);
            };

            sourceNodeRef.current = source;
            source.start(0, startFromOffset);
            
            const now = ctx.currentTime;
            setAudioStartTime(now);
            setAudioOffset(startFromOffset);
            setAudioPlayingId(versionId);
            setPlaybackDuration(audioBuffer.duration);
            setCurrentTime(startFromOffset);

            // Cập nhật UI mỗi 100ms
            timerRef.current = window.setInterval(() => {
                const elapsedRealTime = ctx.currentTime - now;
                const elapsedAudioTime = elapsedRealTime * effectiveSpeed;
                const newPos = startFromOffset + elapsedAudioTime;
                if (newPos >= audioBuffer.duration) {
                    stopTimer();
                    setCurrentTime(audioBuffer.duration);
                } else {
                    setCurrentTime(newPos);
                }
            }, 100);
        } catch (e) {
            console.error("Playback error", e);
        }
    }, [getAudioContext, playbackSpeed, stopTimer]);

    const handleStop = useCallback(() => {
        if (sourceNodeRef.current) {
            sourceNodeRef.current.onended = null;
            sourceNodeRef.current.stop();
        }
        stopTimer();
        setAudioPlayingId(null);
        setIsPreviewPlaying(false);
        setAudioOffset(0);
        setCurrentTime(0);
    }, [stopTimer]);

    const handleSeek = useCallback(async (version: AudioVersion, newTime: number) => {
        // Giới hạn trong khoảng [0, duration]
        const seekTime = Math.max(0, Math.min(newTime, playbackDuration || 0));
        setAudioOffset(seekTime);
        setCurrentTime(seekTime);
        
        // Nếu đang phát version này thì phát lại từ vị trí mới
        if (audioPlayingId === version.id) {
            await playAudioData(version.data, version.id, version.speed, seekTime);
        }
    }, [audioPlayingId, playbackDuration, playAudioData]);

    const handleGenerateAudio = useCallback(async (
        text: string,
        index: number,
        prefix: 'original' | 'translated'
    ) => {
        const uniqueKey = `${prefix}-${index}`;
        setAudioLoadingKey(uniqueKey);
        setAudioChunkStatus('Đang khởi tạo...');

        try {
            const cleanText = text.replace(/\d{1,2}:\d{2}/g, '').trim();
            const textChunks = splitTextForTTS(cleanText);
            const mp3Chunks: ArrayBuffer[] = [];

            for (let i = 0; i < textChunks.length; i++) {
                setAudioChunkStatus(`Đang tạo âm thanh: đoạn ${i + 1}/${textChunks.length}`);
                const base64Mp3 = await generateSpeechEdge(textChunks[i], selectedVoice, playbackSpeed);
                mp3Chunks.push(base64ToArrayBuffer(base64Mp3));
                if (i < textChunks.length - 1) await new Promise(r => setTimeout(r, 300));
            }

            const totalLength = mp3Chunks.reduce((acc, curr) => acc + curr.byteLength, 0);
            const mergedMp3 = new Uint8Array(totalLength);
            let byteOffset = 0;
            mp3Chunks.forEach(chunk => {
                mergedMp3.set(new Uint8Array(chunk), byteOffset);
                byteOffset += chunk.byteLength;
            });

            const finalBase64Audio = arrayBufferToBase64(mergedMp3.buffer);
            
            // Lấy duration từ việc decode buffer đã merge
            const ctx = getAudioContext();
            const audioBuffer = await ctx.decodeAudioData(mergedMp3.buffer.slice(0));
            const duration = audioBuffer.duration;

            const selectedVoiceObj = VOICES.find(v => v.value === selectedVoice);
            const voiceLabel = selectedVoiceObj ? selectedVoiceObj.label.split('(')[0].trim() : selectedVoice;

            const newVersion: AudioVersion = {
                id: Date.now().toString(),
                voiceValue: selectedVoice,
                voiceLabel: voiceLabel,
                data: finalBase64Audio,
                speed: playbackSpeed,
                duration: duration,
                createdAt: Date.now()
            };

            setAudioCache(prev => {
                const currentList = prev[uniqueKey] || [];
                const next = { ...prev, [uniqueKey]: [newVersion, ...currentList] };
                return normalizeAudioCache(next);
            });

            await playAudioData(finalBase64Audio, newVersion.id, newVersion.speed);
        } catch (err) {
            console.error("Audio Generation Error", err);
            alert("Có lỗi khi tạo âm thanh. Hãy thử lại.");
        } finally {
            setAudioLoadingKey(null);
            setAudioChunkStatus('');
        }
    }, [selectedVoice, playbackSpeed, playAudioData, getAudioContext, normalizeAudioCache]);

    const handlePlayVersion = useCallback(async (version: AudioVersion) => {
        const isCurrentlyPlaying = audioPlayingId === version.id;
        if (isCurrentlyPlaying) {
            if (sourceNodeRef.current && audioContextRef.current) {
                const elapsed = (audioContextRef.current.currentTime - audioStartTime) * (version.speed || 1);
                const newOffset = Math.min((version.duration || Number.MAX_SAFE_INTEGER), audioOffset + elapsed);
                sourceNodeRef.current.onended = null;
                sourceNodeRef.current.stop();
                stopTimer();
                setAudioOffset(newOffset);
                setCurrentTime(newOffset);
                setAudioPlayingId(null);
            }
            return;
        }
        await playAudioData(version.data, version.id, version.speed, 0);
    }, [audioPlayingId, audioStartTime, audioOffset, playAudioData, stopTimer]);

    const handleDeleteVersion = useCallback((uniqueKey: string, versionId: string) => {
        setAudioCache(prev => {
            const currentList = prev[uniqueKey] || [];
            const filtered = currentList.filter(v => v.id !== versionId);
            const next = { ...prev };
            if (filtered.length > 0) {
                next[uniqueKey] = filtered;
            } else {
                delete next[uniqueKey];
            }
            return normalizeAudioCache(next);
        });
        if (audioPlayingId === versionId) {
            if (sourceNodeRef.current) sourceNodeRef.current.stop();
            stopTimer();
            setAudioPlayingId(null);
            setAudioOffset(0);
            setCurrentTime(0);
        }
    }, [audioPlayingId, normalizeAudioCache, stopTimer]);

    const handleDownloadAudioVersion = useCallback((version: AudioVersion, index: number, prefix: string) => {
        try {
            // Edge TTS trả MP3 → download trực tiếp
            const mp3Buffer = base64ToArrayBuffer(version.data);
            const blob = new Blob([mp3Buffer], { type: 'audio/mp3' });
            downloadBlob(blob, `audio-${prefix}-${index}-${version.voiceValue}.mp3`);
        } catch (err) {
            console.error("Error creating download", err);
            alert("Lỗi khi tải file âm thanh.");
        }
    }, []);

    const handleVoicePreview = useCallback(async () => {
        if (isPreviewPlaying) {
            if (sourceNodeRef.current) sourceNodeRef.current.stop();
            setIsPreviewPlaying(false);
            return;
        }
        if (isPreviewingVoice) return;
        if (sourceNodeRef.current) {
            sourceNodeRef.current.stop();
            setAudioPlayingId(null);
            setIsPreviewPlaying(false);
        }

        let textToPlay = "";
        const activeElement = document.activeElement;
        if (activeElement && (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement)) {
            const start = activeElement.selectionStart; const end = activeElement.selectionEnd;
            if (start !== null && end !== null && start !== end) textToPlay = activeElement.value.substring(start, end).trim();
        }
        if (!textToPlay) {
            const windowSelection = window.getSelection()?.toString().trim();
            if (windowSelection) textToPlay = windowSelection;
        }
        if (!textToPlay) {
            const selectedPreviewText = VOICE_PREVIEW_TEXTS[selectedVoice];
            if (selectedPreviewText) {
                textToPlay = selectedPreviewText;
            } else {
                const isEnglishVoice = selectedVoice.startsWith('en-');
                const isVietnameseContext = language === 'Vietnamese' || storyTargetLanguage === 'Vietnamese';
                textToPlay = isEnglishVoice
                    ? 'Hello, this is a quick voice preview for your project.'
                    : (isVietnameseContext
                        ? 'Xin chào, đây là bản nghe thử giọng đọc cho dự án của bạn.'
                        : 'Hello, this is a quick voice preview for your project.');
            }
        }

        const cacheKey = `${selectedVoice}-${textToPlay}`;
        let audioBuffer = previewCacheRef.current[cacheKey];
        const ctx = getAudioContext();

        try {
            if (ctx.state === 'suspended') await ctx.resume();
            if (!audioBuffer) {
                const cachedBase64 = await AudioStorageService.getAudio(cacheKey);
                if (cachedBase64) {
                    audioBuffer = await ctx.decodeAudioData(base64ToArrayBuffer(cachedBase64).slice(0));
                    rememberPreviewBuffer(cacheKey, audioBuffer);
                } else {
                    setIsPreviewingVoice(true);
                    const base64Audio = await generateSpeechEdge(textToPlay, selectedVoice, playbackSpeed);
                    audioBuffer = await ctx.decodeAudioData(base64ToArrayBuffer(base64Audio).slice(0));
                    rememberPreviewBuffer(cacheKey, audioBuffer);
                    await AudioStorageService.saveAudio(cacheKey, base64Audio);
                    setIsPreviewingVoice(false);
                }
            }
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = playbackSpeed;
            source.connect(ctx.destination);
            source.onended = () => { setIsPreviewingVoice(false); setIsPreviewPlaying(false); };
            sourceNodeRef.current = source;
            setIsPreviewPlaying(true);
            source.start();
        } catch (err) {
            console.error(err);
            setIsPreviewingVoice(false); setIsPreviewPlaying(false);
        }
    }, [
        isPreviewPlaying,
        isPreviewingVoice,
        selectedVoice,
        playbackSpeed,
        language,
        storyTargetLanguage,
        getAudioContext,
        rememberPreviewBuffer
    ]);

    const setNormalizedAudioCache = useCallback((cache: Record<string, AudioVersion[]>) => {
        setAudioCache(normalizeAudioCache(cache));
    }, [normalizeAudioCache]);

    return {
        // State
        audioLoadingKey,
        audioChunkStatus,
        audioPlayingId,
        audioCache,
        isPreviewingVoice,
        isPreviewPlaying,
        audioOffset,
        currentTime,
        playbackDuration,
        // Setters needed by ScriptWriter
        setAudioPlayingId,
        setAudioOffset,
        setAudioCache: setNormalizedAudioCache,
        // Actions
        handleGenerateAudio,
        handlePlayVersion,
        handleDeleteVersion,
        handleDownloadAudioVersion,
        handleVoicePreview,
        handleStop,
        handleSeek
    };
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { generateSpeech } from '../services/geminiService';
import { AudioStorageService } from '../services/audioStorageService';
import { encodeToBase64, decodeFromBase64, decodeAudioData, addWavHeader, splitTextForTTS } from '../utils/audioUtils';
import { VOICES } from '../constants';
import type { AudioVersion } from '../types';

const SAMPLE_RATE = 24000;
const NUM_CHANNELS = 1;

interface UseAudioPlayerOptions {
    selectedVoice: string;
    playbackSpeed: number;
    language: string;
    storyTargetLanguage: string;
}

export function useAudioPlayer({ selectedVoice, playbackSpeed, language, storyTargetLanguage }: UseAudioPlayerOptions) {
    const [audioLoadingKey, setAudioLoadingKey] = useState<string | null>(null);
    const [audioChunkStatus, setAudioChunkStatus] = useState<string>('');
    const [audioPlayingId, setAudioPlayingId] = useState<string | null>(null);
    const [audioCache, setAudioCache] = useState<Record<string, AudioVersion[]>>({});

    const [isPreviewingVoice, setIsPreviewingVoice] = useState<boolean>(false);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
    const previewCacheRef = useRef<Record<string, AudioBuffer>>({});

    const [audioOffset, setAudioOffset] = useState<number>(0);
    const [audioStartTime, setAudioStartTime] = useState<number>(0);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (sourceNodeRef.current) sourceNodeRef.current.stop();
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    // Sync playback speed to active source
    useEffect(() => {
        if (sourceNodeRef.current) sourceNodeRef.current.playbackRate.value = playbackSpeed;
    }, [playbackSpeed]);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: SAMPLE_RATE });
        }
        return audioContextRef.current;
    }, []);

    const playAudioData = useCallback(async (
        base64Audio: string,
        versionId: string,
        speedOverride?: number,
        startFromOffset: number = 0
    ) => {
        if (sourceNodeRef.current) sourceNodeRef.current.stop();
        setAudioPlayingId(null);
        setIsPreviewPlaying(false);

        const ctx = getAudioContext();

        try {
            if (ctx.state === 'suspended') await ctx.resume();
            const audioBuffer = await decodeAudioData(decodeFromBase64(base64Audio), ctx, SAMPLE_RATE, NUM_CHANNELS);
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = speedOverride || playbackSpeed;
            source.connect(ctx.destination);

            source.onended = () => {
                setAudioPlayingId(prev => {
                    if (prev === versionId) { setAudioOffset(0); return null; }
                    return prev;
                });
                setIsPreviewPlaying(false);
            };

            sourceNodeRef.current = source;
            source.start(0, startFromOffset);
            setAudioStartTime(ctx.currentTime);
            setAudioOffset(startFromOffset);
            setAudioPlayingId(versionId);
        } catch (e) {
            console.error("Playback error", e);
        }
    }, [getAudioContext, playbackSpeed]);

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
            const pcmChunks: Uint8Array[] = [];

            for (let i = 0; i < textChunks.length; i++) {
                setAudioChunkStatus(`Đang tạo âm thanh: đoạn ${i + 1}/${textChunks.length}`);
                const base64Chunk = await generateSpeech(textChunks[i], selectedVoice);
                pcmChunks.push(decodeFromBase64(base64Chunk));
                if (i < textChunks.length - 1) await new Promise(r => setTimeout(r, 600));
            }

            const totalLength = pcmChunks.reduce((acc, curr) => acc + curr.length, 0);
            const mergedPCM = new Uint8Array(totalLength);
            let offset = 0;
            pcmChunks.forEach(chunk => {
                mergedPCM.set(chunk, offset);
                offset += chunk.length;
            });

            const finalBase64Audio = encodeToBase64(mergedPCM);
            const selectedVoiceObj = VOICES.find(v => v.value === selectedVoice);
            const voiceLabel = selectedVoiceObj ? selectedVoiceObj.label.split('(')[0].trim() : selectedVoice;

            const newVersion: AudioVersion = {
                id: Date.now().toString(),
                voiceValue: selectedVoice,
                voiceLabel: voiceLabel,
                data: finalBase64Audio,
                speed: playbackSpeed,
                createdAt: Date.now()
            };

            setAudioCache(prev => {
                const currentList = prev[uniqueKey] || [];
                return { ...prev, [uniqueKey]: [newVersion, ...currentList] };
            });

            await playAudioData(finalBase64Audio, newVersion.id, newVersion.speed);
        } catch (err) {
            console.error("Audio Generation Error", err);
            alert("Có lỗi khi tạo âm thanh. Hãy thử lại.");
        } finally {
            setAudioLoadingKey(null);
            setAudioChunkStatus('');
        }
    }, [selectedVoice, playbackSpeed, playAudioData]);

    const handlePlayVersion = useCallback(async (version: AudioVersion) => {
        const isCurrentlyPlaying = audioPlayingId === version.id;
        if (isCurrentlyPlaying) {
            if (sourceNodeRef.current && audioContextRef.current) {
                const elapsed = (audioContextRef.current.currentTime - audioStartTime) * (version.speed || 1);
                const newOffset = audioOffset + elapsed;
                sourceNodeRef.current.onended = null;
                sourceNodeRef.current.stop();
                setAudioOffset(newOffset);
                setAudioPlayingId(null);
            }
            return;
        }
        await playAudioData(version.data, version.id, version.speed, audioOffset);
    }, [audioPlayingId, audioStartTime, audioOffset, playAudioData]);

    const handleDeleteVersion = useCallback((uniqueKey: string, versionId: string) => {
        setAudioCache(prev => {
            const currentList = prev[uniqueKey] || [];
            return { ...prev, [uniqueKey]: currentList.filter(v => v.id !== versionId) };
        });
        if (audioPlayingId === versionId) {
            if (sourceNodeRef.current) sourceNodeRef.current.stop();
            setAudioPlayingId(null);
            setAudioOffset(0);
        }
    }, [audioPlayingId]);

    const handleDownloadAudioVersion = useCallback((version: AudioVersion, index: number, prefix: string) => {
        try {
            const rawBytes = decodeFromBase64(version.data);
            const effectiveSampleRate = Math.round(SAMPLE_RATE * (version.speed || 1));
            const wavBuffer = addWavHeader(rawBytes, effectiveSampleRate);
            const blob = new Blob([wavBuffer], { type: 'audio/wav' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `audio-${prefix}-${index}-${version.voiceValue}-${version.speed || 1}x.wav`;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
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
            const isVietnamese = language === 'Vietnamese' || storyTargetLanguage === 'Vietnamese';
            textToPlay = isVietnamese ? "Xin chào, đây là bản nghe thử giọng đọc." : "Hello, this is a voice sample.";
        }

        const cacheKey = `${selectedVoice}-${textToPlay}`;
        let audioBuffer = previewCacheRef.current[cacheKey];
        const ctx = getAudioContext();

        try {
            if (ctx.state === 'suspended') await ctx.resume();
            if (!audioBuffer) {
                const cachedBase64 = await AudioStorageService.getAudio(cacheKey);
                if (cachedBase64) {
                    audioBuffer = await decodeAudioData(decodeFromBase64(cachedBase64), ctx, SAMPLE_RATE, NUM_CHANNELS);
                    previewCacheRef.current[cacheKey] = audioBuffer;
                } else {
                    setIsPreviewingVoice(true);
                    const base64Audio = await generateSpeech(textToPlay, selectedVoice);
                    audioBuffer = await decodeAudioData(decodeFromBase64(base64Audio), ctx, SAMPLE_RATE, NUM_CHANNELS);
                    previewCacheRef.current[cacheKey] = audioBuffer;
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
    }, [isPreviewPlaying, isPreviewingVoice, selectedVoice, playbackSpeed, language, storyTargetLanguage, getAudioContext]);

    return {
        // State
        audioLoadingKey,
        audioChunkStatus,
        audioPlayingId,
        audioCache,
        isPreviewingVoice,
        isPreviewPlaying,
        audioOffset,
        // Setters needed by ScriptWriter
        setAudioPlayingId,
        setAudioOffset,
        setAudioCache,
        // Actions
        handleGenerateAudio,
        handlePlayVersion,
        handleDeleteVersion,
        handleDownloadAudioVersion,
        handleVoicePreview,
    };
}

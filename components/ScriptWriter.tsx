
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateScript, translateStory, generateSpeech } from '../services/geminiService';
import { AudioStorageService } from '../services/audioStorageService';
import type { AnalysisResult, ScriptData, ScriptMetadata, AudioVersion } from '../types';
import { BackIcon, KeyPointIcon, ScriptIcon, TranslateIcon, YoutubeIcon, DownloadIcon, PlayIcon, PauseIcon, SpeakerIcon, TrashIcon, PlusIcon, XIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { CopyButton } from './CopyButton';
import { LanguageSelector } from './LanguageSelector';

interface ScriptWriterProps {
  input: {
    result: AnalysisResult;
    language: string;
    initialData?: {
        scriptData?: ScriptData | null;
        translatedScriptData?: ScriptData | null;
        audioCache?: Record<string, AudioVersion[]>; 
    }
  };
  onBack: (data?: { 
      scriptData: ScriptData | null, 
      translatedScriptData: ScriptData | null,
      audioCache: Record<string, AudioVersion[]>
  }) => void;
  onExport: (scriptData: ScriptData | null, translatedScriptData: ScriptData | null) => void;
}

const STYLES = [
  { value: 'Inspirational', label: 'Truyền cảm hứng (Kể chuyện đời thường)' },
  { value: 'Fairy Tale', label: 'Cổ tích / Ngụ ngôn' },
  { value: 'Thriller/Mystery', label: 'Trinh thám / Kịch tính' },
  { value: 'Sci-Fi', label: 'Khoa học viễn tưởng' },
  { value: 'Comedy', label: 'Hài hước / Châm biếm' },
  { value: 'Journalistic', label: 'Phóng sự / Tin tức' },
  { value: 'Cinematic', label: 'Điện ảnh (Mô tả cảnh quay)' },
  { value: 'Educational', label: 'Giáo dục / Giải thích (Explainer)' },
  { value: 'Review', label: 'Đánh giá / Review sản phẩm' },
  { value: 'Debate', label: 'Tranh luận / Phản biện' },
  { value: 'Vlog', label: 'Vlog / Tâm sự cá nhân' },
];

const TONES = [
  { value: 'Emotional', label: 'Cảm xúc / Sâu lắng' },
  { value: 'Enthusiastic', label: 'Hào hứng / Năng lượng cao' },
  { value: 'Serious', label: 'Nghiêm túc / Chuyên gia' },
  { value: 'Witty', label: 'Dí dỏm / Thông minh' },
  { value: 'Dark', label: 'U tối / Bí ẩn' },
  { value: 'Chill', label: 'Thư giãn / Nhẹ nhàng' },
  { value: 'Sarcastic', label: 'Mỉa mai / Châm chọc' },
  { value: 'Empathetic', label: 'Đồng cảm / Chia sẻ' },
  { value: 'Urgent', label: 'Khẩn cấp / Kêu gọi hành động' },
];

const PLOT_TWISTS = [
  { value: 'None', label: 'Không có (Tuyến tính)' },
  { value: 'Subtle Reversal', label: 'Đảo ngược nhẹ' },
  { value: 'Major Shock', label: 'Cú sốc lớn (Plot Twist)' },
  { value: 'Cliffhanger', label: 'Kết mở / Gay cấn' },
  { value: 'False Protagonist', label: 'Đổi vai chính bất ngờ' },
];

const ARCHETYPES = [
  { value: 'Narrator', label: 'Người dẫn chuyện (Khách quan)' },
  { value: 'The Hero', label: 'Người hùng (Vượt khó)' },
  { value: 'The Sage', label: 'Nhà hiền triết (Chia sẻ kiến thức)' },
  { value: 'The Rebel', label: 'Kẻ nổi loạn (Phá cách)' },
  { value: 'The Everyman', label: 'Người bình thường (Gần gũi)' },
  { value: 'The Jester', label: 'Chú hề (Vui vẻ/Hài hước)' },
  { value: 'The Explorer', label: 'Nhà thám hiểm (Khám phá)' },
];

const FOCUS_OPTIONS = [
  { value: 'Balanced', label: 'Cân bằng' },
  { value: 'Dialogue Heavy', label: 'Tập trung Đối thoại' },
  { value: 'Action Oriented', label: 'Tập trung Hành động' },
  { value: 'Descriptive', label: 'Tập trung Mô tả/Cảm xúc' },
  { value: 'Data Driven', label: 'Tập trung Số liệu/Sự kiện' },
];

const TARGET_AUDIENCES = [
    { value: 'General', label: 'Đại chúng (Mọi người)' },
    { value: 'Kids', label: 'Trẻ em (Dễ hiểu, vui nhộn)' },
    { value: 'Gen Z', label: 'Gen Z (Trẻ trung, bắt trend)' },
    { value: 'Professionals', label: 'Chuyên gia / Doanh nhân' },
    { value: 'Tech Savvy', label: 'Người yêu công nghệ' },
    { value: 'Seniors', label: 'Người lớn tuổi (Trang trọng)' },
];

const PACING_OPTIONS = [
    { value: 'Moderate', label: 'Vừa phải (Tiêu chuẩn)' },
    { value: 'Fast', label: 'Nhanh (Dồn dập, kịch tính)' },
    { value: 'Slow', label: 'Chậm rãi (Chiêm nghiệm, thư giãn)' },
    { value: 'Dynamic', label: 'Biến đổi (Lúc nhanh lúc chậm)' },
];

const VOICES = [
  { value: 'Kore', label: 'Kore (Nữ, Dịu dàng)' },
  { value: 'Puck', label: 'Puck (Nam, Tự nhiên)' },
  { value: 'Charon', label: 'Charon (Nam, Trầm ấm)' },
  { value: 'Fenrir', label: 'Fenrir (Nam, Mạnh mẽ)' },
  { value: 'Zephyr', label: 'Zephyr (Nữ, Thanh thoát)' },
  { value: 'Aoede', label: 'Aoede (Nữ, Biểu cảm)' },
  { value: 'Leda', label: 'Leda (Nữ, Nhẹ nhàng)' },
  { value: 'Orus', label: 'Orus (Nam, Tự tin)' },
  { value: 'Alnilam', label: 'Alnilam (Nam, Sâu lắng)' },
  { value: 'Erinome', label: 'Erinome (Nữ, Trưởng thành)' },
];

const SPEED_OPTIONS = [
    { value: 0.75, label: '0.75x - Hơi chậm' },
    { value: 1, label: '1x - Bình thường' },
    { value: 1.05, label: '1.05x - Hơi nhanh' },
    { value: 1.1, label: '1.1x - Nhanh' },
    { value: 1.15, label: '1.15x - Rất nhanh' },
];

const PAGINATION_THRESHOLD = 4;

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

const addWavHeader = (samples: Uint8Array, sampleRate: number = 24000, numChannels: number = 1) => {
    const buffer = new ArrayBuffer(44 + samples.length);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); 
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true); 
    view.setUint16(32, numChannels * 2, true); 
    view.setUint16(34, 16, true); 
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length, true);
    const dataView = new Uint8Array(buffer, 44);
    dataView.set(samples);
    return buffer;
};

// Cải thiện hàm chia nhỏ văn bản: Luôn tìm dấu câu kết thúc gần nhất
const splitTextForTTS = (text: string, maxWords: number = 150): string[] => {
    // Tách theo dấu kết thúc câu chuyên sâu
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    sentences.forEach(sentence => {
        const wordCount = (currentChunk + sentence).split(/\s+/).length;
        if (wordCount > maxWords && currentChunk !== "") {
            chunks.push(currentChunk.trim());
            currentChunk = sentence;
        } else {
            currentChunk += sentence;
        }
    });

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    return chunks;
};

export const ScriptWriter: React.FC<ScriptWriterProps> = ({ input, onBack, onExport }) => {
  const { result, language, initialData } = input;
  const [duration, setDuration] = useState<number>(5);
  const [numberOfParts, setNumberOfParts] = useState<number>(1);
  
  const [editableKeyPoints, setEditableKeyPoints] = useState<string[]>(result.keyPoints);
  const [newKeyPointInput, setNewKeyPointInput] = useState('');

  const [selectedStyle, setSelectedStyle] = useState<string>('Inspirational');
  const [selectedTone, setSelectedTone] = useState<string>('Emotional');
  const [creativityLevel, setCreativityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [plotTwist, setPlotTwist] = useState<string>('None');
  const [characterArchetype, setCharacterArchetype] = useState<string>('Narrator');
  const [focus, setFocus] = useState<string>('Balanced');
  const [targetAudience, setTargetAudience] = useState<string>('General');
  const [pacing, setPacing] = useState<string>('Moderate');
  const [selectedVoice, setSelectedVoice] = useState<string>('Kore');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [scriptParts, setScriptParts] = useState<string[] | null>(null);
  const [metadata, setMetadata] = useState<ScriptMetadata | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const defaultTranslationLang = language === 'Vietnamese' ? 'English' : 'Vietnamese';
  const [storyTargetLanguage, setStoryTargetLanguage] = useState<string>(defaultTranslationLang);
  
  const [translatedScriptParts, setTranslatedScriptParts] = useState<string[] | null>(null);
  const [translatedMetadata, setTranslatedMetadata] = useState<ScriptMetadata | null>(null);
  
  const [isTranslatingScript, setIsTranslatingScript] = useState<boolean>(false);
  const [translationScriptError, setTranslationScriptError] = useState<string | null>(null);
  const [translationProgress, setTranslationProgress] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'original' | 'translated'>('original');
  const [currentPage, setCurrentPage] = useState<number>(0); 

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

  useEffect(() => {
    if (initialData?.scriptData) {
        setScriptParts(initialData.scriptData.parts);
        setMetadata(initialData.scriptData.metadata);
    }
    if (initialData?.translatedScriptData) {
        setTranslatedScriptParts(initialData.translatedScriptData.parts);
        setTranslatedMetadata(initialData.translatedScriptData.metadata);
        setActiveTab('translated');
    }
    if (initialData?.audioCache) {
        setAudioCache(initialData.audioCache);
    }
  }, [initialData]);

  useEffect(() => {
      setEditableKeyPoints(result.keyPoints);
      if (result.suggestedStyle && STYLES.some(s => s.value === result.suggestedStyle)) setSelectedStyle(result.suggestedStyle);
      if (result.suggestedTone && TONES.some(t => t.value === result.suggestedTone)) setSelectedTone(result.suggestedTone);
      if (result.suggestedAudience && TARGET_AUDIENCES.some(a => a.value === result.suggestedAudience)) setTargetAudience(result.suggestedAudience);
      if (result.suggestedPacing && PACING_OPTIONS.some(p => p.value === result.suggestedPacing)) setPacing(result.suggestedPacing);
      if (result.suggestedVoice && VOICES.some(v => v.value === result.suggestedVoice)) setSelectedVoice(result.suggestedVoice);
      if (result.suggestedDuration) setDuration(result.suggestedDuration);
      if (result.suggestedParts) setNumberOfParts(result.suggestedParts);
  }, [result]);

  useEffect(() => {
    return () => {
        if (sourceNodeRef.current) sourceNodeRef.current.stop();
        if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (sourceNodeRef.current) sourceNodeRef.current.playbackRate.value = playbackSpeed;
  }, [playbackSpeed]);

  const handleBackClick = () => {
    const currentScriptData = scriptParts && metadata ? { parts: scriptParts, metadata } : null;
    const currentTranslatedScriptData = translatedScriptParts && translatedMetadata ? { parts: translatedScriptParts, metadata: translatedMetadata } : null;
    onBack({ scriptData: currentScriptData, translatedScriptData: currentTranslatedScriptData, audioCache: audioCache });
  };

  const handleAddKeyPoint = () => {
      if (!newKeyPointInput.trim()) return;
      setEditableKeyPoints(prev => [...prev, newKeyPointInput.trim()]);
      setNewKeyPointInput('');
  };

  const handleRemoveKeyPoint = (indexToRemove: number) => {
      setEditableKeyPoints(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setScriptParts(null);
    setMetadata(null);
    setTranslatedScriptParts(null);
    setTranslatedMetadata(null);
    setTranslationScriptError(null);
    setAudioCache({});
    setActiveTab('original');
    setCurrentPage(0);

    const modifiedResult: AnalysisResult = { ...result, keyPoints: editableKeyPoints };

    try {
      const generatedData = await generateScript(
          modifiedResult, duration, numberOfParts, language,
          selectedStyle, selectedTone, creativityLevel, plotTwist,
          characterArchetype, focus, targetAudience, pacing
      );
      setScriptParts(generatedData.parts);
      setMetadata(generatedData.metadata);
    } catch (err) {
      console.error(err);
      setError('Không thể tạo câu chuyện. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [result, editableKeyPoints, duration, numberOfParts, language, selectedStyle, selectedTone, creativityLevel, plotTwist, characterArchetype, focus, targetAudience, pacing]);

  const handleTranslateScript = useCallback(async () => {
    if (!scriptParts || !metadata) return;
    setIsTranslatingScript(true);
    setTranslationScriptError(null);
    setTranslatedScriptParts(null);
    setTranslatedMetadata(null);
    setTranslationProgress(0);
    setCurrentPage(0);
    try {
      const translation = await translateStory(scriptParts, metadata, storyTargetLanguage, (progress) => setTranslationProgress(progress));
      setTranslatedScriptParts(translation.parts);
      setTranslatedMetadata(translation.metadata);
    } catch (err) {
      console.error(err);
      setTranslationScriptError('Không thể dịch câu chuyện. Vui lòng thử lại.');
    } finally {
      setIsTranslatingScript(false);
    }
  }, [scriptParts, metadata, storyTargetLanguage]);

  const handleScriptPartChange = (index: number, value: string) => {
    if (scriptParts) {
        const newParts = [...scriptParts];
        newParts[index] = value;
        setScriptParts(newParts);
    }
  };

  const handleTranslatedPartChange = (index: number, value: string) => {
    if (translatedScriptParts) {
        const newParts = [...translatedScriptParts];
        newParts[index] = value;
        setTranslatedScriptParts(newParts);
    }
  };
  
  const handleMetadataChange = (field: keyof ScriptMetadata, value: any, index?: number) => {
      if (!metadata) return;
      const newMetadata = { ...metadata };
      if (field === 'titles' && typeof index === 'number') newMetadata.titles[index] = value;
      else if (field === 'hashtags' && typeof index === 'number') newMetadata.hashtags[index] = value;
      else if (field === 'description') newMetadata.description = value;
      setMetadata(newMetadata);
  };

  const handleTranslatedMetadataChange = (field: keyof ScriptMetadata, value: any, index?: number) => {
      if (!translatedMetadata) return;
      const newMetadata = { ...translatedMetadata };
      if (field === 'titles' && typeof index === 'number') newMetadata.titles[index] = value;
      else if (field === 'hashtags' && typeof index === 'number') newMetadata.hashtags[index] = value;
      else if (field === 'description') newMetadata.description = value;
      setTranslatedMetadata(newMetadata);
  };

  const calculateTotalWords = (parts: string[] | null) => {
      if (!parts) return 0;
      return parts.join(' ').trim().split(/\s+/).length;
  };

  const handleExportClick = () => {
    const currentScriptData = scriptParts && metadata ? { parts: scriptParts, metadata } : null;
    const currentTranslatedScriptData = translatedScriptParts && translatedMetadata ? { parts: translatedScriptParts, metadata: translatedMetadata } : null;
    onExport(currentScriptData, currentTranslatedScriptData);
  };

  const handleDownloadText = (parts: string[], title: string = 'script') => {
      const content = parts.join('\n\n');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${title}.txt`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleGenerateAudio = async (text: string, index: number, prefix: 'original' | 'translated') => {
    const uniqueKey = `${prefix}-${index}`;
    setAudioLoadingKey(uniqueKey);
    setAudioChunkStatus('Đang khởi tạo...');

    try {
        // Làm sạch văn bản khỏi mốc thời gian nếu còn sót
        const cleanText = text.replace(/\d{1,2}:\d{2}/g, '').trim();
        const textChunks = splitTextForTTS(cleanText);
        const pcmChunks: Uint8Array[] = [];

        for (let i = 0; i < textChunks.length; i++) {
            setAudioChunkStatus(`Đang tạo âm thanh: đoạn ${i + 1}/${textChunks.length}`);
            const base64Chunk = await generateSpeech(textChunks[i], selectedVoice);
            pcmChunks.push(decode(base64Chunk));
            // Slight delay between chunks to avoid rate limiting
            if (i < textChunks.length - 1) await new Promise(r => setTimeout(r, 600));
        }

        const totalLength = pcmChunks.reduce((acc, curr) => acc + curr.length, 0);
        const mergedPCM = new Uint8Array(totalLength);
        let offset = 0;
        pcmChunks.forEach(chunk => {
            mergedPCM.set(chunk, offset);
            offset += chunk.length;
        });

        const finalBase64Audio = encode(mergedPCM);
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
  };

  const playAudioData = async (base64Audio: string, versionId: string, speedOverride?: number, startFromOffset: number = 0) => {
       if (sourceNodeRef.current) sourceNodeRef.current.stop();
        setAudioPlayingId(null);
        setIsPreviewPlaying(false);

        if (!audioContextRef.current) {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        const ctx = audioContextRef.current;
        
        try {
            if (ctx.state === 'suspended') await ctx.resume();
            const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
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
  };

  const handlePlayVersion = async (version: AudioVersion) => {
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
  };

  const handleDeleteVersion = (uniqueKey: string, versionId: string) => {
      setAudioCache(prev => {
          const currentList = prev[uniqueKey] || [];
          return { ...prev, [uniqueKey]: currentList.filter(v => v.id !== versionId) };
      });
      if (audioPlayingId === versionId) {
          if (sourceNodeRef.current) sourceNodeRef.current.stop();
          setAudioPlayingId(null);
          setAudioOffset(0);
      }
  };

  const handleDownloadAudioVersion = (version: AudioVersion, index: number, prefix: string) => {
      try {
          const rawBytes = decode(version.data);
          const effectiveSampleRate = Math.round(24000 * (version.speed || 1));
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
  };

  const handleVoicePreview = async () => {
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
      if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      }
      const ctx = audioContextRef.current;
      try {
        if (ctx.state === 'suspended') await ctx.resume();
        if (!audioBuffer) {
            const cachedBase64 = await AudioStorageService.getAudio(cacheKey);
            if (cachedBase64) {
                 audioBuffer = await decodeAudioData(decode(cachedBase64), ctx, 24000, 1);
                 previewCacheRef.current[cacheKey] = audioBuffer;
            } else {
                setIsPreviewingVoice(true);
                const base64Audio = await generateSpeech(textToPlay, selectedVoice);
                audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
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
  };

  const durationPerPart = (duration / numberOfParts).toFixed(1);
  const estimatedWordsPerPart = Math.round((duration / numberOfParts) * 140);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-5xl mx-auto">
        <header className="relative text-center mb-8">
          <button onClick={handleBackClick} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" aria-label="Quay lại">
            <BackIcon /> <span className="hidden sm:inline">Quay Lại</span>
          </button>
          { (scriptParts || translatedScriptParts) && (
               <button onClick={handleExportClick} className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md" aria-label="Lưu JSON">
                  <DownloadIcon /> <span className="hidden sm:inline">Xuất File JSON</span>
                </button>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">Người Kể Chuyện AI</h1>
        </header>

        <main>
          <div className="mb-6 p-5 bg-slate-800/50 border border-slate-700 rounded-xl shadow-sm">
            <h2 className="text-lg font-bold text-slate-300 mb-3 border-b border-slate-700 pb-2">Nội dung gốc:</h2>
            <div className="flex flex-col md:flex-row gap-6">
                 <div className="flex-1">
                    <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">Chủ Đề</h3>
                    <div className="flex items-start gap-2">
                        <p className="text-slate-300 text-base flex-grow">{result.topic}</p>
                        <div className="mt-1"><CopyButton textToCopy={result.topic} /></div>
                    </div>
                </div>
                <div className="flex-[2]">
                    <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-2">Các Ý Chính</h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                         {editableKeyPoints.map((point, index) => (
                             <div key={index} className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-purple-900/40 text-purple-200 border border-purple-700/50 group hover:border-purple-500 transition-colors">
                                <span className="mr-2">{point}</span>
                                <button onClick={() => handleRemoveKeyPoint(index)} className="text-purple-400 hover:text-red-400 p-0.5 rounded-full hover:bg-slate-800 transition-colors" title="Xóa ý này" disabled={isLoading}><XIcon /></button>
                             </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input type="text" value={newKeyPointInput} onChange={(e) => setNewKeyPointInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddKeyPoint()} placeholder="Thêm ý chính mới..." className="flex-grow px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 outline-none" disabled={isLoading} />
                        <button onClick={handleAddKeyPoint} disabled={!newKeyPointInput.trim() || isLoading} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-50"><PlusIcon />Thêm</button>
                    </div>
                </div>
            </div>
          </div>
          
          <div className="p-6 bg-slate-800 rounded-xl shadow-lg space-y-6 mb-8 border border-slate-700">
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1 space-y-6">
                     <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2 flex items-center gap-2"><ScriptIcon /> Cấu Hình Sáng Tạo</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-semibold text-slate-400 mb-1">Phong cách</label>
                             <select value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                {STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-semibold text-slate-400 mb-1">Giọng điệu</label>
                             <select value={selectedTone} onChange={(e) => setSelectedTone(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                {TONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-semibold text-slate-400 mb-1">Hình Tượng Nhân Vật</label>
                             <select value={characterArchetype} onChange={(e) => setCharacterArchetype(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                {ARCHETYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                            </select>
                        </div>
                         <div>
                             <label className="block text-xs font-semibold text-slate-400 mb-1">Trọng tâm</label>
                             <select value={focus} onChange={(e) => setFocus(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                {FOCUS_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>
                        </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Khán giả mục tiêu</label>
                            <select value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                {TARGET_AUDIENCES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Nhịp độ</label>
                            <select value={pacing} onChange={(e) => setPacing(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                {PACING_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Yếu Tố Bất Ngờ (Plot Twist)</label>
                            <select value={plotTwist} onChange={(e) => setPlotTwist(e.target.value)} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                {PLOT_TWISTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1">Mức độ sáng tạo</label>
                            <div className="flex gap-1 bg-slate-700 p-1 rounded-lg h-[38px] items-center">
                                {['low', 'medium', 'high'].map((level) => (
                                    <button key={level} onClick={() => setCreativityLevel(level as any)} className={`flex-1 py-1 rounded-md text-xs font-medium transition-all ${creativityLevel === level ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-600'}`} disabled={isLoading}>{level === 'low' ? 'Bám sát' : level === 'medium' ? 'Cân bằng' : 'Hư cấu'}</button>
                                ))}
                            </div>
                        </div>
                     </div>
                     <div>
                        <div className="flex gap-4 mb-1">
                            <label className="block text-xs font-semibold text-slate-400 flex-1">Giọng đọc (AI)</label>
                            <label className="block text-xs font-semibold text-slate-400 w-1/3">Tốc độ</label>
                        </div>
                        <div className="flex gap-2">
                             <div className="relative flex-grow">
                                <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="w-full px-3 py-2 pl-9 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500 appearance-none">
                                    {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                                </select>
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><SpeakerIcon /></div>
                            </div>
                            <div className="w-1/3 min-w-[120px]">
                                <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-200 focus:ring-1 focus:ring-purple-500">
                                    {SPEED_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>
                            <button onClick={handleVoicePreview} disabled={isPreviewingVoice || isLoading} className={`px-3 py-2 rounded-lg border border-slate-600 transition-all flex-shrink-0 ${isPreviewPlaying ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50'}`} title="Nghe thử">
                                {isPreviewingVoice ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isPreviewPlaying ? <PauseIcon /> : <PlayIcon />}
                            </button>
                        </div>
                     </div>
                </div>

                <div className="flex-1 space-y-6 flex flex-col justify-between">
                    <div>
                         <h3 className="text-lg font-bold text-slate-200 border-b border-slate-700 pb-2 mb-4 flex items-center gap-2"><span className="text-xl">⏱️</span> Cấu Trúc & Thời Lượng</h3>
                         <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-baseline mb-2">
                                    <label htmlFor="duration" className="block text-sm font-semibold text-slate-300">Tổng thời lượng</label>
                                    <div className="flex items-center gap-2">
                                        {result.suggestedDuration && duration === result.suggestedDuration && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">✨ Gợi ý từ AI</span>}
                                        <span className="font-bold text-purple-400 text-lg">{duration} phút</span>
                                    </div>
                                </div>
                                <input id="duration" type="range" min="1" max="30" step="1" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" disabled={isLoading} />
                            </div>
                            <div>
                                <div className="flex justify-between items-baseline mb-2">
                                     <label htmlFor="parts" className="block text-sm font-semibold text-slate-300">Chia thành</label>
                                    <div className="flex items-center gap-2">
                                        {result.suggestedParts && numberOfParts === result.suggestedParts && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">✨ Gợi ý từ AI</span>}
                                        <select id="parts" value={numberOfParts} onChange={(e) => setNumberOfParts(Number(e.target.value))} className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 text-sm focus:ring-1 focus:ring-purple-500" disabled={isLoading}>
                                            {[1, 2, 3, 4, 5, 6].map((num) => <option key={num} value={num}>{num} Phần</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-indigo-900/30 border border-indigo-500/30 rounded-lg">
                                    <p className="text-xs text-indigo-300 flex justify-between">
                                        <span>Mỗi phần: <strong>~{durationPerPart} phút</strong></span>
                                        <span>Dự kiến: <strong>~{estimatedWordsPerPart} từ</strong></span>
                                    </p>
                                </div>
                            </div>
                         </div>
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500">
                        {isLoading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Đang viết kịch bản...</span></> : <><ScriptIcon /><span>Tạo Câu Chuyện</span></>}
                    </button>
                </div>
            </div>
          </div>

          {error && <ErrorDisplay message={error} />}
          
          {scriptParts && !isLoading && (
            <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-0">
                    <button onClick={() => { setActiveTab('original'); setAudioPlayingId(null); setCurrentPage(0); setAudioOffset(0); }} className={`px-6 py-3 rounded-t-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'original' ? 'bg-slate-800 text-purple-400 border-t-2 border-purple-500' : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>Kịch Bản Gốc</button>
                    <button onClick={() => { setActiveTab('translated'); setAudioPlayingId(null); setCurrentPage(0); setAudioOffset(0); }} className={`px-6 py-3 rounded-t-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'translated' ? 'bg-slate-800 text-green-400 border-t-2 border-green-500' : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>Kịch Bản Dịch {translatedScriptParts ? '(Đã có)' : ''}</button>
                </div>

                <div className={`bg-slate-800 rounded-b-xl rounded-tr-xl p-6 shadow-2xl border-t-0 ${activeTab === 'original' ? 'border-t-2 border-purple-500/20' : 'border-t-2 border-green-500/20'}`}>
                    {activeTab === 'original' && metadata && (
                        <div className="space-y-8 animate-fade-in">
                             <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><div className="scale-[4]"><YoutubeIcon /></div></div>
                                <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2 mb-4"><span className="bg-purple-500/10 p-1.5 rounded-lg"><YoutubeIcon /></span>Thông Tin Video (Gốc)</h2>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Tiêu đề</h3>
                                            <div className="space-y-2">
                                                {metadata.titles.map((title, idx) => (
                                                    <div key={idx} className="flex gap-2 group/item">
                                                        <input type="text" value={title} onChange={(e) => handleMetadataChange('titles', e.target.value, idx)} className="flex-grow p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-purple-500 outline-none" />
                                                        <div className="opacity-0 group-hover/item:opacity-100 transition-opacity"><CopyButton textToCopy={title} /></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                         <div>
                                             <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">Hashtags</h3><CopyButton textToCopy={metadata.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')} /></div>
                                             <div className="flex flex-wrap gap-2">
                                                {metadata.hashtags.map((tag, idx) => (
                                                    <div key={idx} className="relative group/tag">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">#</span>
                                                        <input type="text" value={tag} onChange={(e) => handleMetadataChange('hashtags', e.target.value, idx)} className="pl-5 pr-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-blue-400 focus:ring-1 focus:ring-blue-500 outline-none text-xs min-w-[60px]" />
                                                    </div>
                                                ))}
                                             </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">Mô tả</h3><CopyButton textToCopy={metadata.description} /></div>
                                        <textarea value={metadata.description} onChange={(e) => handleMetadataChange('description', e.target.value)} className="w-full h-[180px] p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-purple-500 outline-none resize-none" />
                                    </div>
                                </div>
                            </div>

                             <div className="space-y-6">
                                <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                     <h2 className="text-xl font-bold text-purple-400">Nội Dung Kịch Bản</h2>
                                     <div className="flex items-center gap-3">
                                         <button onClick={() => handleDownloadText(scriptParts, 'kich-ban-goc')} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors">Tải Văn Bản</button>
                                         <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded">~{calculateTotalWords(scriptParts)} từ</span>
                                        <CopyButton textToCopy={scriptParts.join('\n\n')} />
                                     </div>
                                </div>
                                {(() => {
                                    const shouldPaginate = scriptParts.length > PAGINATION_THRESHOLD;
                                    const partsToRender = shouldPaginate ? [currentPage] : scriptParts.map((_, i) => i);
                                    return (
                                        <>
                                            {shouldPaginate && (
                                                <div className="flex items-center justify-between mb-4 bg-slate-700/50 p-2 rounded-lg border border-slate-600">
                                                    <button onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); setAudioPlayingId(null); setAudioOffset(0); }} disabled={currentPage === 0} className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"><BackIcon /><span>Trước</span></button>
                                                    <span className="text-sm font-semibold text-purple-400">Phần {currentPage + 1} / {scriptParts.length}</span>
                                                    <button onClick={() => { setCurrentPage(p => Math.min(scriptParts.length - 1, p + 1)); setAudioPlayingId(null); setAudioOffset(0); }} disabled={currentPage === scriptParts.length - 1} className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"><span>Sau</span><div className="rotate-180 transform"><BackIcon /></div></button>
                                                </div>
                                            )}
                                            {partsToRender.map((index) => {
                                                const part = scriptParts[index];
                                                return (
                                                    <div key={index} className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
                                                        <div className="flex justify-between items-center mb-3">
                                                            <h3 className="text-purple-300 font-bold uppercase text-xs tracking-wider flex items-center gap-2"><span className="bg-purple-500/20 w-6 h-6 flex items-center justify-center rounded-full text-purple-400">{index + 1}</span>Phần {index + 1}</h3>
                                                            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Dự kiến: {estimatedWordsPerPart} từ</span>
                                                        </div>
                                                        <textarea value={part} onChange={(e) => handleScriptPartChange(index, e.target.value)} className="w-full min-h-[300px] p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-sans text-lg leading-relaxed focus:outline-none resize-y shadow-inner" placeholder="Nội dung câu chuyện..." />
                                                        <div className="mt-4 flex flex-col gap-3">
                                                             <div className="flex justify-end gap-2 items-center">
                                                                <div className="text-xs text-slate-500 mr-2 flex flex-col items-end">
                                                                    <span>Chọn giọng ở trên và bấm tạo:</span>
                                                                    {audioLoadingKey === `original-${index}` && (
                                                                        <span className="text-purple-400 font-bold animate-pulse text-[10px]">{audioChunkStatus}</span>
                                                                    )}
                                                                </div>
                                                                <button onClick={() => handleGenerateAudio(part, index, 'original')} disabled={audioLoadingKey === `original-${index}`} className="flex items-center gap-2 px-3 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50">
                                                                     {audioLoadingKey === `original-${index}` ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlayIcon />}
                                                                    <span className="text-xs font-semibold">Tạo Audio & Nghe</span>
                                                                </button>
                                                                <CopyButton textToCopy={part} />
                                                            </div>
                                                            {audioCache[`original-${index}`] && audioCache[`original-${index}`].length > 0 && (
                                                                <div className="bg-slate-800 rounded-lg p-3 space-y-2 border border-slate-700">
                                                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Danh sách Audio đã tạo</h4>
                                                                    {audioCache[`original-${index}`].map((version) => (
                                                                        <div key={version.id} className="flex items-center justify-between bg-slate-700/50 p-2 rounded hover:bg-slate-700 transition-colors">
                                                                            <div className="flex items-center gap-3">
                                                                                <button onClick={() => handlePlayVersion(version)} className={`p-2 rounded-full shadow-inner transition-all duration-200 ${audioPlayingId === version.id ? 'bg-purple-500 text-white scale-110' : 'bg-slate-600 text-slate-300 hover:text-white hover:bg-slate-500'}`}>{audioPlayingId === version.id ? <PauseIcon /> : <PlayIcon />}</button>
                                                                                <div className="flex flex-col">
                                                                                    <div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-200">{version.voiceLabel}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600 text-slate-300 font-mono">{version.speed || 1}x</span></div>
                                                                                    <span className="text-[10px] text-slate-500">{new Date(version.createdAt).toLocaleTimeString()}</span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-2">
                                                                                <button onClick={() => handleDownloadAudioVersion(version, index, 'original')} className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-600 rounded transition-colors" title="Tải xuống"><DownloadIcon /></button>
                                                                                <button onClick={() => handleDeleteVersion(`original-${index}`, version.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-colors" title="Xóa"><TrashIcon /></button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'translated' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center text-center space-y-4">
                                {!translatedScriptParts ? (<><div className="p-3 bg-slate-800 rounded-full text-green-400 mb-2"><TranslateIcon /></div><h3 className="text-lg font-bold text-white">Chưa có bản dịch</h3><p className="text-slate-400 text-sm max-w-md">Chọn ngôn ngữ và bấm "Dịch" để AI chuyển đổi toàn bộ kịch bản sang ngôn ngữ mới.</p></>) : null}
                                <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-lg">
                                    <div className="w-full"><LanguageSelector value={storyTargetLanguage} onChange={setStoryTargetLanguage} disabled={isTranslatingScript} /></div>
                                    <button onClick={handleTranslateScript} disabled={isTranslatingScript || !scriptParts} className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white font-semibold rounded-lg shadow-lg hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all min-w-[140px]">{isTranslatingScript ? `Đang dịch... ${translationProgress}%` : translatedScriptParts ? 'Dịch Lại' : 'Bắt Đầu Dịch'}</button>
                                </div>
                                {translationScriptError && <ErrorDisplay message={translationScriptError} />}
                            </div>

                            {translatedScriptParts && translatedMetadata && !isTranslatingScript && (
                                <div className="animate-slide-up space-y-8">
                                    <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 relative overflow-hidden group hover:border-green-500/50 transition-colors">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><div className="scale-[4] text-green-500"><YoutubeIcon /></div></div>
                                        <h2 className="text-xl font-bold text-green-400 flex items-center gap-2 mb-4"><span className="bg-green-500/10 p-1.5 rounded-lg"><YoutubeIcon /></span>Thông Tin Video (Dịch)</h2>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Tiêu đề</h3>
                                                    <div className="space-y-2">
                                                        {translatedMetadata.titles.map((title, idx) => (
                                                            <div key={idx} className="flex gap-2 group/item">
                                                                <input type="text" value={title} onChange={(e) => handleTranslatedMetadataChange('titles', e.target.value, idx)} className="flex-grow p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-green-500 outline-none" />
                                                                <div className="opacity-0 group-hover/item:opacity-100 transition-opacity"><CopyButton textToCopy={title} /></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">Hashtags</h3><CopyButton textToCopy={translatedMetadata.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')} /></div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {translatedMetadata.hashtags.map((tag, idx) => (
                                                            <div key={idx} className="relative group/tag">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">#</span>
                                                                <input type="text" value={tag} onChange={(e) => handleTranslatedMetadataChange('hashtags', e.target.value, idx)} className="pl-5 pr-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-green-400 focus:ring-1 focus:ring-green-500 outline-none text-xs min-w-[60px]" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">Mô tả</h3><CopyButton textToCopy={translatedMetadata.description} /></div>
                                                <textarea value={translatedMetadata.description} onChange={(e) => handleTranslatedMetadataChange('description', e.target.value)} className="w-full h-[180px] p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-green-500 outline-none resize-none" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                            <h2 className="text-xl font-bold text-green-400">Nội Dung Dịch</h2>
                                            <div className="flex items-center gap-3">
                                                 <button onClick={() => handleDownloadText(translatedScriptParts, 'kich-ban-dich')} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors">Tải Văn Bản</button>
                                                <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded">~{calculateTotalWords(translatedScriptParts)} từ</span>
                                                <CopyButton textToCopy={translatedScriptParts.join('\n\n')} />
                                            </div>
                                        </div>
                                        {(() => {
                                             const shouldPaginate = translatedScriptParts.length > PAGINATION_THRESHOLD;
                                             const partsToRender = shouldPaginate ? [currentPage] : translatedScriptParts.map((_, i) => i);
                                             return (
                                                 <>
                                                     {shouldPaginate && (
                                                        <div className="flex items-center justify-between mb-4 bg-slate-700/50 p-2 rounded-lg border border-slate-600">
                                                            <button onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); setAudioPlayingId(null); setAudioOffset(0); }} disabled={currentPage === 0} className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"><BackIcon /><span>Trước</span></button>
                                                            <span className="text-sm font-semibold text-green-400">Phần {currentPage + 1} / {translatedScriptParts.length}</span>
                                                            <button onClick={() => { setCurrentPage(p => Math.min(translatedScriptParts.length - 1, p + 1)); setAudioPlayingId(null); setAudioOffset(0); }} disabled={currentPage === translatedScriptParts.length - 1} className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"><span>Sau</span><div className="rotate-180 transform"><BackIcon /></div></button>
                                                        </div>
                                                     )}
                                                     {partsToRender.map((index) => {
                                                        const part = translatedScriptParts[index];
                                                        return (
                                                            <div key={index} className="bg-slate-900/30 p-4 rounded-xl border border-slate-700/50 focus-within:ring-1 focus-within:ring-green-500/50 transition-all">
                                                                <div className="flex justify-between items-center mb-3"><h3 className="text-green-300 font-bold uppercase text-xs tracking-wider flex items-center gap-2"><span className="bg-green-500/20 w-6 h-6 flex items-center justify-center rounded-full text-green-400">{index + 1}</span>Phần {index + 1}</h3></div>
                                                                <textarea value={part} onChange={(e) => handleTranslatedPartChange(index, e.target.value)} className="w-full min-h-[300px] p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-sans text-lg leading-relaxed focus:outline-none resize-y shadow-inner" placeholder="Nội dung bản dịch..." />
                                                                <div className="mt-4 flex flex-col gap-3">
                                                                     <div className="flex justify-end gap-2 items-center">
                                                                        <div className="text-xs text-slate-500 mr-2 flex flex-col items-end">
                                                                            <span>Chọn giọng ở trên và bấm tạo:</span>
                                                                            {audioLoadingKey === `translated-${index}` && (
                                                                                <span className="text-green-400 font-bold animate-pulse text-[10px]">{audioChunkStatus}</span>
                                                                            )}
                                                                        </div>
                                                                        <button onClick={() => handleGenerateAudio(part, index, 'translated')} disabled={audioLoadingKey === `translated-${index}`} className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors duration-200 disabled:opacity-50">
                                                                             {audioLoadingKey === `translated-${index}` ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlayIcon />}
                                                                            <span className="text-xs font-semibold">Tạo Audio & Nghe</span>
                                                                        </button>
                                                                        <CopyButton textToCopy={part} />
                                                                    </div>
                                                                     {audioCache[`translated-${index}`] && audioCache[`translated-${index}`].length > 0 && (
                                                                        <div className="bg-slate-800 rounded-lg p-3 space-y-2 border border-slate-700">
                                                                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Danh sách Audio đã tạo</h4>
                                                                            {audioCache[`translated-${index}`].map((version) => (
                                                                                <div key={version.id} className="flex items-center justify-between bg-slate-700/50 p-2 rounded hover:bg-slate-700 transition-colors">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <button onClick={() => handlePlayVersion(version)} className={`p-2 rounded-full shadow-inner transition-all duration-200 ${audioPlayingId === version.id ? 'bg-green-500 text-white scale-110' : 'bg-slate-600 text-slate-300 hover:text-white hover:bg-slate-500'}`}>{audioPlayingId === version.id ? <PauseIcon /> : <PlayIcon />}</button>
                                                                                        <div className="flex flex-col">
                                                                                            <div className="flex items-center gap-2"><span className="text-sm font-semibold text-slate-200">{version.voiceLabel}</span><span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-600 text-slate-300 font-mono">{version.speed || 1}x</span></div>
                                                                                            <span className="text-[10px] text-slate-500">{new Date(version.createdAt).toLocaleTimeString()}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <button onClick={() => handleDownloadAudioVersion(version, index, 'translated')} className="p-2 text-slate-400 hover:text-green-400 hover:bg-slate-600 rounded transition-colors" title="Tải xuống"><DownloadIcon /></button>
                                                                                        <button onClick={() => handleDeleteVersion(`translated-${index}`, version.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded transition-colors" title="Xóa"><TrashIcon /></button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                     })}
                                                 </>
                                             );
                                        })()}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};


import React, { useState, useCallback, useEffect } from 'react';
import { generateScript, translateStory } from '../services/geminiService';
import type { AnalysisResult, ScriptData, ScriptMetadata } from '../types';
import { BackIcon, KeyPointIcon, ScriptIcon, TranslateIcon, YoutubeIcon, DownloadIcon, PlayIcon, PauseIcon, SpeakerIcon, PlusIcon, XIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { CopyButton } from './CopyButton';
import { LanguageSelector } from './LanguageSelector';
import {
    STYLES, TONES, PLOT_TWISTS, ARCHETYPES, FOCUS_OPTIONS,
    TARGET_AUDIENCES, PACING_OPTIONS, VOICES, SPEED_OPTIONS,
    PAGINATION_THRESHOLD
} from '../constants';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { downloadText } from '../utils/downloadUtils';
import { AudioVersionList } from './AudioVersionList';

interface ScriptWriterProps {
    input: {
        result: AnalysisResult;
        language: string;
        analysisId?: string;
        initialData?: {
            scriptData?: ScriptData | null;
            translatedScriptData?: ScriptData | null;
        }
    };
    onBack: (data?: {
        scriptData: ScriptData | null,
        translatedScriptData: ScriptData | null,
    }) => void;
    onExport: (scriptData: ScriptData | null, translatedScriptData: ScriptData | null) => void;
    onScriptUpdate?: (data: {
        scriptData: ScriptData | null,
        translatedScriptData: ScriptData | null,
    }) => void;
}

export const ScriptWriter: React.FC<ScriptWriterProps> = ({ input, onBack, onExport, onScriptUpdate }) => {
    const { result, language, analysisId, initialData } = input;
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
    const [selectedVoice, setSelectedVoice] = useState<string>('vi-VN-HoaiMyNeural');
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

    // Use extracted audio player hook (audioCache hydrated from IndexedDB via analysisId)
    const audio = useAudioPlayer({ selectedVoice, playbackSpeed, language, storyTargetLanguage, analysisId });

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
    }, [initialData]);

    // Sync script data up to parent so F5/reload doesn't lose the generated story
    useEffect(() => {
        if (!onScriptUpdate) return;
        onScriptUpdate({
            scriptData: scriptParts && metadata ? { parts: scriptParts, metadata } : null,
            translatedScriptData: translatedScriptParts && translatedMetadata
                ? { parts: translatedScriptParts, metadata: translatedMetadata }
                : null,
        });
    }, [scriptParts, metadata, translatedScriptParts, translatedMetadata, onScriptUpdate]);

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

    // Build the {scriptData, translatedScriptData} snapshot used by Back/Export/onScriptUpdate.
    const buildSnapshot = () => ({
        scriptData: scriptParts && metadata ? { parts: scriptParts, metadata } : null,
        translatedScriptData: translatedScriptParts && translatedMetadata
            ? { parts: translatedScriptParts, metadata: translatedMetadata }
            : null,
    });

    const handleBackClick = () => {
        onBack(buildSnapshot());
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
        audio.setAudioCache({});
        setActiveTab('original');
        setCurrentPage(0);

        const modifiedResult: AnalysisResult = { ...result, keyPoints: editableKeyPoints };

        try {
            const generatedData = await generateScript({
                translatedResult: modifiedResult, totalDuration: duration, numberOfParts, language,
                style: selectedStyle, tone: selectedTone, creativity: creativityLevel, plotTwist,
                characterArchetype, focus, targetAudience, pacing,
            });
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

    // ── Generic part/metadata mutators (merged from previously duplicated original/translated pairs) ──
    const updatePartAt = (
        parts: string[] | null,
        setParts: React.Dispatch<React.SetStateAction<string[] | null>>,
        index: number,
        value: string
    ) => {
        if (!parts) return;
        const next = [...parts];
        next[index] = value;
        setParts(next);
    };

    const updateMetadataField = (
        meta: ScriptMetadata | null,
        setMeta: React.Dispatch<React.SetStateAction<ScriptMetadata | null>>,
        field: keyof ScriptMetadata,
        value: string,
        index?: number
    ) => {
        if (!meta) return;
        const next = { ...meta };
        if (field === 'titles' && typeof index === 'number') next.titles[index] = value;
        else if (field === 'hashtags' && typeof index === 'number') next.hashtags[index] = value;
        else if (field === 'description') next.description = value;
        setMeta(next);
    };

    const handleScriptPartChange = (index: number, value: string) =>
        updatePartAt(scriptParts, setScriptParts, index, value);

    const handleTranslatedPartChange = (index: number, value: string) =>
        updatePartAt(translatedScriptParts, setTranslatedScriptParts, index, value);

    const handleMetadataChange = (field: keyof ScriptMetadata, value: string, index?: number) =>
        updateMetadataField(metadata, setMetadata, field, value, index);

    const handleTranslatedMetadataChange = (field: keyof ScriptMetadata, value: string, index?: number) =>
        updateMetadataField(translatedMetadata, setTranslatedMetadata, field, value, index);

    const calculateTotalWords = (parts: string[] | null) => {
        if (!parts) return 0;
        return parts.join(' ').trim().split(/\s+/).length;
    };

    const handleExportClick = () => {
        const snap = buildSnapshot();
        onExport(snap.scriptData, snap.translatedScriptData);
    };

    const handleDownloadText = (parts: string[], title: string = 'script') => {
        downloadText(parts.join('\n\n'), `${title}.txt`);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const durationPerPart = (duration / numberOfParts).toFixed(1);
    const estimatedWordsPerPart = Math.round((duration / numberOfParts) * 140);

    // Render helper: now thin wrapper around the extracted AudioVersionList component
    const renderAudioVersionList = (uniqueKey: string, index: number, prefix: string, accentColor: string) => (
        <AudioVersionList
            versions={audio.audioCache[uniqueKey]}
            uniqueKey={uniqueKey}
            index={index}
            prefix={prefix}
            accentColor={accentColor}
            audioPlayingId={audio.audioPlayingId}
            currentTime={audio.currentTime}
            onPlay={audio.handlePlayVersion}
            onStop={audio.handleStop}
            onDelete={audio.handleDeleteVersion}
            onDownload={audio.handleDownloadAudioVersion}
            onSeek={audio.handleSeek}
            formatTime={formatTime}
        />
    );

    // Render helper for script part card (used in both original and translated tabs)
    const renderScriptPartCard = (
        part: string,
        index: number,
        prefix: 'original' | 'translated',
        onPartChange: (index: number, value: string) => void,
        accentColor: string
    ) => {
        const uniqueKey = `${prefix}-${index}`;
        return (
            <div key={index} className={`bg-slate-900/30 p-4 rounded-xl border border-slate-700/50 focus-within:ring-1 focus-within:ring-${accentColor}-500/50 transition-all`}>
                <div className="flex justify-between items-center mb-3">
                    <h3 className={`text-${accentColor}-300 font-bold uppercase text-xs tracking-wider flex items-center gap-2`}><span className={`bg-${accentColor}-500/20 w-6 h-6 flex items-center justify-center rounded-full text-${accentColor}-400`}>{index + 1}</span>Phần {index + 1}</h3>
                    {prefix === 'original' && <span className="text-[10px] text-slate-500 uppercase tracking-widest">Dự kiến: {estimatedWordsPerPart} từ</span>}
                </div>
                <textarea value={part} onChange={(e) => onPartChange(index, e.target.value)} className="w-full min-h-[500px] p-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 font-sans text-lg leading-relaxed focus:outline-none resize-y shadow-inner" placeholder={prefix === 'original' ? "Nội dung câu chuyện..." : "Nội dung bản dịch..."} />
                <div className="mt-4 flex flex-col gap-3">
                    <div className="flex justify-end gap-2 items-center">
                        <div className="text-xs text-slate-500 mr-2 flex flex-col items-end">
                            <span>Chọn giọng ở trên và bấm tạo:</span>
                            {audio.audioLoadingKey === uniqueKey && (
                                <span className={`text-${accentColor}-400 font-bold animate-pulse text-[10px]`}>{audio.audioChunkStatus}</span>
                            )}
                        </div>
                        <button onClick={() => audio.handleGenerateAudio(part, index, prefix)} disabled={audio.audioLoadingKey === uniqueKey} className={`flex items-center gap-2 px-3 py-2 rounded-md bg-${accentColor}-600 text-white hover:bg-${accentColor}-700 transition-colors duration-200 disabled:opacity-50`}>
                            {audio.audioLoadingKey === uniqueKey ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <PlayIcon />}
                            <span className="text-xs font-semibold">Tạo Audio & Nghe</span>
                        </button>
                        <CopyButton textToCopy={part} />
                    </div>
                    {renderAudioVersionList(uniqueKey, index, prefix, accentColor)}
                </div>
            </div>
        );
    };

    // Render helper for pagination controls
    const renderPagination = (parts: string[], accentColor: string) => {
        if (parts.length <= PAGINATION_THRESHOLD) return null;
        return (
            <div className="flex items-center justify-between mb-4 bg-slate-700/50 p-2 rounded-lg border border-slate-600">
                <button onClick={() => { setCurrentPage(p => Math.max(0, p - 1)); audio.setAudioPlayingId(null); audio.setAudioOffset(0); }} disabled={currentPage === 0} className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"><BackIcon /><span>Trước</span></button>
                <span className={`text-sm font-semibold text-${accentColor}-400`}>Phần {currentPage + 1} / {parts.length}</span>
                <button onClick={() => { setCurrentPage(p => Math.min(parts.length - 1, p + 1)); audio.setAudioPlayingId(null); audio.setAudioOffset(0); }} disabled={currentPage === parts.length - 1} className="flex items-center gap-1 px-3 py-1.5 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"><span>Sau</span><div className="rotate-180 transform"><BackIcon /></div></button>
            </div>
        );
    };

    // Render helper for metadata section
    const renderMetadataSection = (
        meta: ScriptMetadata,
        onMetaChange: (field: keyof ScriptMetadata, value: any, index?: number) => void,
        accentColor: string,
        title: string
    ) => (
        <div className={`bg-slate-900/50 border border-slate-700 rounded-xl p-5 relative overflow-hidden group hover:border-${accentColor}-500/50 transition-colors`}>
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><div className={`scale-[4] ${accentColor === 'green' ? 'text-green-500' : ''}`}><YoutubeIcon /></div></div>
            <h2 className={`text-xl font-bold text-${accentColor}-400 flex items-center gap-2 mb-4`}><span className={`bg-${accentColor}-500/10 p-1.5 rounded-lg`}><YoutubeIcon /></span>{title}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Tiêu đề</h3>
                        <div className="space-y-2">
                            {meta.titles.map((title, idx) => (
                                <div key={idx} className="flex gap-2 group/item">
                                    <input type="text" value={title} onChange={(e) => onMetaChange('titles', e.target.value, idx)} className={`flex-grow p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-${accentColor}-500 outline-none`} />
                                    <div className="opacity-0 group-hover/item:opacity-100 transition-opacity"><CopyButton textToCopy={title} /></div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">Hashtags</h3><CopyButton textToCopy={meta.hashtags.map(t => t.startsWith('#') ? t : `#${t}`).join(' ')} /></div>
                        <div className="flex flex-wrap gap-2">
                            {meta.hashtags.map((tag, idx) => (
                                <div key={idx} className="relative group/tag">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-600 text-xs">#</span>
                                    <input type="text" value={tag} onChange={(e) => onMetaChange('hashtags', e.target.value, idx)} className={`pl-5 pr-2 py-1 bg-slate-800 border border-slate-700 rounded-full text-${accentColor === 'purple' ? 'blue' : accentColor}-400 focus:ring-1 focus:ring-${accentColor === 'purple' ? 'blue' : accentColor}-500 outline-none text-xs min-w-[60px]`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-2"><h3 className="text-xs font-bold text-slate-500 uppercase">Mô tả</h3><CopyButton textToCopy={meta.description} /></div>
                    <textarea value={meta.description} onChange={(e) => onMetaChange('description', e.target.value)} className={`w-full h-[180px] p-3 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-1 focus:ring-${accentColor}-500 outline-none resize-none`} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8 animate-fade-in">
            <div className="w-full max-w-6xl mx-auto">
                <header className="relative text-center mb-8">
                    <button onClick={handleBackClick} className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors" aria-label="Quay lại">
                        <BackIcon /> <span className="hidden sm:inline">Quay Lại</span>
                    </button>
                    {(scriptParts || translatedScriptParts) && (
                        <button onClick={handleExportClick} className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md" aria-label="Lưu JSON">
                            <DownloadIcon /> <span className="hidden sm:inline">Xuất File JSON</span>
                        </button>
                    )}
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-500">Người Kể Chuyện AI</h1>
                </header>

                <main>
                    {/* Source Content Section */}
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

                    {/* Creative Configuration Section */}
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
                                        <button onClick={audio.handleVoicePreview} disabled={audio.isPreviewingVoice || isLoading} className={`px-3 py-2 rounded-lg border border-slate-600 transition-all flex-shrink-0 ${audio.isPreviewPlaying ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-700 hover:bg-slate-600 text-white disabled:opacity-50'}`} title="Nghe thử">
                                            {audio.isPreviewingVoice ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : audio.isPreviewPlaying ? <PauseIcon /> : <PlayIcon />}
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

                    {/* Script Output Section */}
                    {scriptParts && !isLoading && (
                        <div className="animate-fade-in">
                            <div className="flex items-center gap-2 mb-0">
                                <button onClick={() => { setActiveTab('original'); audio.setAudioPlayingId(null); setCurrentPage(0); audio.setAudioOffset(0); }} className={`px-6 py-3 rounded-t-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'original' ? 'bg-slate-800 text-purple-400 border-t-2 border-purple-500' : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>Kịch Bản Gốc</button>
                                <button onClick={() => { setActiveTab('translated'); audio.setAudioPlayingId(null); setCurrentPage(0); audio.setAudioOffset(0); }} className={`px-6 py-3 rounded-t-xl font-bold text-sm sm:text-base transition-all ${activeTab === 'translated' ? 'bg-slate-800 text-green-400 border-t-2 border-green-500' : 'bg-slate-900 text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}>Kịch Bản Dịch {translatedScriptParts ? '(Đã có)' : ''}</button>
                            </div>

                            <div className={`bg-slate-800 rounded-b-xl rounded-tr-xl p-6 shadow-2xl border-t-0 ${activeTab === 'original' ? 'border-t-2 border-purple-500/20' : 'border-t-2 border-green-500/20'}`}>
                                {/* Original Tab */}
                                {activeTab === 'original' && metadata && (
                                    <div className="space-y-8 animate-fade-in">
                                        {renderMetadataSection(metadata, handleMetadataChange, 'purple', 'Thông Tin Video (Gốc)')}
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                                <h2 className="text-xl font-bold text-purple-400">Nội Dung Kịch Bản</h2>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => handleDownloadText(scriptParts, 'kich-ban-goc')} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors">Tải Văn Bản</button>
                                                    <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded">~{calculateTotalWords(scriptParts)} từ</span>
                                                    <CopyButton textToCopy={scriptParts.join('\n\n')} />
                                                </div>
                                            </div>
                                            {renderPagination(scriptParts, 'purple')}
                                            {(scriptParts.length > PAGINATION_THRESHOLD ? [currentPage] : scriptParts.map((_, i) => i)).map(index =>
                                                renderScriptPartCard(scriptParts[index], index, 'original', handleScriptPartChange, 'purple')
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Translated Tab */}
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
                                                {renderMetadataSection(translatedMetadata, handleTranslatedMetadataChange, 'green', 'Thông Tin Video (Dịch)')}
                                                <div className="space-y-6">
                                                    <div className="flex justify-between items-center border-b border-slate-700 pb-2">
                                                        <h2 className="text-xl font-bold text-green-400">Nội Dung Dịch</h2>
                                                        <div className="flex items-center gap-3">
                                                            <button onClick={() => handleDownloadText(translatedScriptParts, 'kich-ban-dich')} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-md transition-colors">Tải Văn Bản</button>
                                                            <span className="text-xs font-medium text-slate-500 bg-slate-900 px-2 py-1 rounded">~{calculateTotalWords(translatedScriptParts)} từ</span>
                                                            <CopyButton textToCopy={translatedScriptParts.join('\n\n')} />
                                                        </div>
                                                    </div>
                                                    {renderPagination(translatedScriptParts, 'green')}
                                                    {(translatedScriptParts.length > PAGINATION_THRESHOLD ? [currentPage] : translatedScriptParts.map((_, i) => i)).map(index =>
                                                        renderScriptPartCard(translatedScriptParts[index], index, 'translated', handleTranslatedPartChange, 'green')
                                                    )}
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

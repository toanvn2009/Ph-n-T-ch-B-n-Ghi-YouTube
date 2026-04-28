import React from 'react';
import { DownloadIcon, PauseIcon, PlayIcon, TrashIcon } from './icons';
import type { AudioVersion } from '../types';

interface AudioVersionListProps {
    versions: AudioVersion[] | undefined;
    uniqueKey: string;
    index: number;
    prefix: string;
    accentColor: string;
    audioPlayingId: string | null;
    currentTime: number;
    onPlay: (version: AudioVersion) => void;
    onStop: () => void;
    onDelete: (uniqueKey: string, versionId: string) => void;
    onDownload: (version: AudioVersion, index: number, prefix: string) => void;
    onSeek: (version: AudioVersion, time: number) => void;
    formatTime: (seconds: number) => string;
}

/**
 * Presentational list of TTS audio takes for one script part.
 * Extracted from ScriptWriter.tsx to keep that component focused on layout.
 */
export const AudioVersionList: React.FC<AudioVersionListProps> = ({
    versions, uniqueKey, index, prefix, accentColor,
    audioPlayingId, currentTime,
    onPlay, onStop, onDelete, onDownload, onSeek, formatTime,
}) => {
    if (!versions || versions.length === 0) return null;
    return (
        <div className="bg-slate-800/80 rounded-xl p-4 gap-3 border border-slate-700/50 shadow-inner">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Bản thu âm sẳn có
                </h4>
                <span className="text-[10px] text-slate-500 font-medium bg-slate-900/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                    {versions.length} phiên bản
                </span>
            </div>

            <div className="space-y-3">
                {versions.map((version) => {
                    const isPlaying = audioPlayingId === version.id;
                    return (
                        <div key={version.id} className={`flex flex-col gap-2 p-3 rounded-lg transition-all duration-300 border ${isPlaying ? `bg-slate-700/40 border-${accentColor}-500/50 shadow-lg ring-1 ring-${accentColor}-500/20` : 'bg-slate-900/30 border-slate-700/50 hover:bg-slate-700/30 hover:border-slate-600'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => isPlaying ? onStop() : onPlay(version)}
                                        className={`p-2.5 rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95 ${isPlaying ? `bg-${accentColor}-500 text-white shadow-${accentColor}-500/20` : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'}`}
                                    >
                                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                    </button>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-200">{version.voiceLabel}</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700">
                                                {version.speed || 1}x
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-medium">
                                            {new Date(version.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {version.duration ? formatTime(version.duration) : '--:--'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <button onClick={() => onDownload(version, index, prefix)} className="p-2 text-slate-400 hover:text-green-400 hover:bg-green-400/10 rounded-lg transition-all" title="Tải xuống"><DownloadIcon /></button>
                                    <button onClick={() => onDelete(uniqueKey, version.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Xóa"><TrashIcon /></button>
                                </div>
                            </div>

                            {isPlaying && version.duration && (
                                <div className="mt-1 px-1">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <span className="text-[10px] font-mono text-indigo-400 font-bold">{formatTime(currentTime)}</span>
                                        <span className="text-[10px] font-mono text-slate-500">{formatTime(version.duration)}</span>
                                    </div>
                                    <div
                                        className="h-1.5 w-full bg-slate-800 rounded-full cursor-pointer relative overflow-hidden group border border-slate-700/50"
                                        onClick={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = e.clientX - rect.left;
                                            const clickedPos = (x / rect.width) * version.duration!;
                                            onSeek(version, clickedPos);
                                        }}
                                    >
                                        <div
                                            className={`absolute left-0 top-0 h-full bg-gradient-to-r from-${accentColor}-600 to-${accentColor}-400 rounded-full transition-all duration-100`}
                                            style={{ width: `${(currentTime / version.duration) * 100}%` }}
                                        />
                                        <div className="absolute top-0 bottom-0 w-0.5 bg-white opacity-0 group-hover:opacity-50 transition-opacity" style={{ transform: 'translateX(-50%)' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

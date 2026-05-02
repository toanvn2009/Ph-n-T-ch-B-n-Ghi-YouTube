
import React, { useState, useRef, useMemo } from 'react';
import { TextIcon, VideoIcon, UploadIcon, FileIcon } from './icons';

export type InputMode = 'text' | 'file';

interface TranscriptInputProps {
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  textData: string;
  onTextChange: (value: string) => void;
  fileData: { name: string; type: string; data: string } | null;
  onFileChange: (file: { name: string; type: string; data: string } | null) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

export const TranscriptInput: React.FC<TranscriptInputProps> = ({ 
  mode, 
  setMode, 
  textData, 
  onTextChange, 
  fileData, 
  onFileChange, 
  onAnalyze, 
  isLoading 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Calculate word count memoized for performance
  const wordCount = useMemo(() => {
    if (!textData.trim()) return 0;
    return textData.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, [textData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Increased to 150MB limit as requested
    if (file.size > 150 * 1024 * 1024) {
        setFileError('Kích thước file quá lớn. Vui lòng chọn file dưới 150MB.');
        return;
    }

    setFileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
        const base64String = event.target?.result as string;
        // Remove data URL prefix (e.g., "data:video/mp4;base64,")
        const base64Data = base64String.split(',')[1];
        onFileChange({
            name: file.name,
            type: file.type,
            data: base64Data
        });
    };
    reader.readAsDataURL(file);
  };

  const isAnalyzeDisabled = () => {
    if (isLoading) return true;
    if (mode === 'text') return !textData.trim();
    if (mode === 'file') return !fileData;
    return true;
  };

  const handleAnalyzeClick = () => {
    onAnalyze();
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
      {/* Tabs */}
      <div className="flex p-1 bg-slate-800 rounded-xl border border-slate-700">
        <button
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
            <TextIcon />
            <span className="hidden sm:inline">Văn Bản (Transcript)</span>
            <span className="sm:hidden">Văn Bản</span>
        </button>
        <button
            onClick={() => setMode('file')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'file' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
        >
            <VideoIcon />
            <span className="hidden sm:inline">Tải Video Lên</span>
            <span className="sm:hidden">Video</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6 min-h-[500px] flex flex-col relative">
        
        {mode === 'text' && (
            <div className="relative group">
                <textarea
                    value={textData}
                    onChange={(e) => onTextChange(e.target.value)}
                    placeholder="Dán bản ghi (transcript) video của bạn vào đây..."
                    className="w-full h-64 p-4 pb-10 bg-slate-900 border border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 resize-y text-slate-300 placeholder-slate-500"
                    disabled={isLoading}
                />
                <div className="absolute bottom-3 right-4 flex items-center gap-2 pointer-events-none">
                    <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded bg-slate-800 border border-slate-700 transition-colors ${wordCount > 0 ? 'text-indigo-400 border-indigo-500/30' : 'text-slate-500'}`}>
                        {wordCount.toLocaleString()} TỪ
                    </span>
                </div>
            </div>
        )}

        {mode === 'file' && (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-600 rounded-lg hover:border-indigo-500 transition-colors bg-slate-900/50">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="video/*,audio/*"
                    className="hidden"
                    disabled={isLoading}
                />
                {!fileData ? (
                    <div className="text-center p-6">
                        <div className="mx-auto w-12 h-12 mb-4 text-slate-400">
                            <UploadIcon />
                        </div>
                        <p className="text-lg font-medium text-slate-300 mb-2">Kéo thả hoặc chọn file Video/Audio</p>
                        <p className="text-sm text-slate-500 mb-6">Hỗ trợ MP4, MP3, WAV (Max 150MB)</p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                        >
                            Chọn File
                        </button>
                        {fileError && <p className="mt-4 text-red-400 text-sm">{fileError}</p>}
                    </div>
                ) : (
                    <div className="text-center w-full p-6">
                        <div className="mx-auto w-12 h-12 mb-4 text-green-400">
                            <FileIcon />
                        </div>
                        <p className="text-lg font-medium text-white mb-2 break-all">{fileData.name}</p>
                        <p className="text-sm text-slate-400 mb-6 uppercase">{fileData.type.split('/')[1]}</p>
                        <button
                            onClick={() => onFileChange(null)}
                            className="text-red-400 hover:text-red-300 text-sm hover:underline"
                        >
                            Xóa file này
                        </button>
                    </div>
                )}
            </div>
        )}

        <div className="mt-6 flex justify-center">
            <button
                onClick={handleAnalyzeClick}
                disabled={isAnalyzeDisabled()}
                className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
            >
                {isLoading ? 'Đang Phân Tích...' : 'Bắt Đầu Phân Tích'}
            </button>
        </div>
      </div>
    </div>
  );
};

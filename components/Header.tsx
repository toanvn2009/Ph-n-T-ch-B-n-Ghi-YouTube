import React, { useRef } from 'react';
import { HistoryIcon, UploadIcon } from './icons';

interface HeaderProps {
  onOpenHistory: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHistory, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <header className="relative text-center">
        <div className="absolute right-0 top-0 flex items-center gap-2">
            <input 
                type="file" 
                accept=".json" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={onImport}
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-lg hover:bg-slate-700 border border-slate-700 transition-all duration-200 flex items-center gap-2"
                title="Nhập file JSON"
            >
                <UploadIcon />
                <span className="hidden sm:inline text-sm font-medium">Nhập JSON</span>
            </button>
            <button
                onClick={onOpenHistory}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/80 rounded-lg hover:bg-slate-700 border border-slate-700 transition-all duration-200 flex items-center gap-2"
                title="Lịch sử phân tích"
            >
                <HistoryIcon />
                <span className="hidden sm:inline text-sm font-medium">Lịch sử</span>
            </button>
        </div>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-500">
        Phân Tích Bản Ghi YouTube
      </h1>
      <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
        Dán bản ghi video vào ô bên dưới để AI xác định chủ đề chính và các điểm cốt lõi.
      </p>
    </header>
  );
};
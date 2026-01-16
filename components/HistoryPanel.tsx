import React from 'react';
import { SavedAnalysis } from '../types';
import { TrashIcon, XIcon } from './icons';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedAnalysis[];
  onLoad: (item: SavedAnalysis) => void;
  onDelete: (id: string) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, savedItems, onLoad, onDelete }) => {
  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className={`relative w-full max-w-md h-full bg-slate-800 border-l border-slate-700 shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 backdrop-blur z-10">
          <h2 className="text-xl font-bold text-slate-200">Lịch Sử Phân Tích</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors">
            <XIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {savedItems.length === 0 ? (
            <div className="text-center text-slate-500 mt-10">
              <p>Chưa có mục nào được lưu.</p>
            </div>
          ) : (
            savedItems.map((item) => (
              <div key={item.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-indigo-500 transition-all group flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(item.timestamp).toLocaleDateString('vi-VN', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-600"
                    title="Xóa"
                  >
                    <TrashIcon />
                  </button>
                </div>
                
                <h3 className="font-semibold text-sky-400 line-clamp-2 leading-tight">
                    {item.result.topic}
                </h3>
                
                <p className="text-sm text-slate-400 line-clamp-2 italic border-l-2 border-slate-600 pl-2">
                    {item.transcript}
                </p>
                
                <button
                    onClick={() => onLoad(item)}
                    className="mt-2 w-full py-2 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded transition-colors text-sm font-medium"
                >
                    Tải lại kết quả
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
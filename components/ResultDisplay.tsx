
import React from 'react';
import type { AnalysisResult } from '../types';
import { CopyButton } from './CopyButton';
import { LanguageSelector } from './LanguageSelector';
import { KeyPointIcon, ScriptIcon, TranslateIcon, SaveIcon, CheckIcon, DownloadIcon, TextIcon, SpeakerIcon, YoutubeIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';

interface ResultDisplayProps {
  result: AnalysisResult;
  translatedResult: AnalysisResult | null;
  onTranslate: () => void;
  isTranslating: boolean;
  targetLanguage: string;
  onLanguageChange: (lang: string) => void;
  translationError: string | null;
  onGoToScriptWriter: () => void;
  onSave: () => void;
  isSaved: boolean;
  onExport: () => void;
}

// Maps matching ScriptWriter constants for display purposes
const STYLE_LABELS: Record<string, string> = {
  'Inspirational': 'Truyền cảm hứng',
  'Fairy Tale': 'Cổ tích / Ngụ ngôn',
  'Thriller/Mystery': 'Trinh thám / Kịch tính',
  'Sci-Fi': 'Khoa học viễn tưởng',
  'Comedy': 'Hài hước / Châm biếm',
  'Journalistic': 'Phóng sự / Tin tức',
  'Cinematic': 'Điện ảnh',
  'Educational': 'Giáo dục / Giải thích',
  'Review': 'Đánh giá / Review',
  'Debate': 'Tranh luận / Phản biện',
  'Vlog': 'Vlog / Tâm sự'
};

const TONE_LABELS: Record<string, string> = {
  'Emotional': 'Cảm xúc',
  'Enthusiastic': 'Hào hứng',
  'Serious': 'Nghiêm túc',
  'Witty': 'Dí dỏm',
  'Dark': 'U tối',
  'Chill': 'Thư giãn',
  'Sarcastic': 'Mỉa mai',
  'Empathetic': 'Đồng cảm',
  'Urgent': 'Khẩn cấp'
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  result,
  translatedResult,
  onTranslate,
  isTranslating,
  targetLanguage,
  onLanguageChange,
  translationError,
  onGoToScriptWriter,
  onSave,
  isSaved,
  onExport
}) => {
  const keyPointsText = result.keyPoints.map(point => `- ${point}`).join('\n');
  const hashtagsText = result.suggestedHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ');
  
  const translatedKeyPointsText = translatedResult?.keyPoints.map(point => `- ${point}`).join('\n') ?? '';
  const translatedHashtagsText = translatedResult?.suggestedHashtags.map(tag => tag.startsWith('#') ? tag : `#${tag}`).join(' ') ?? '';

  return (
    <div className="space-y-8">
      {/* Topic & Actions */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-start mb-3 gap-4">
          <h2 className="text-2xl font-bold text-sky-400">Chủ Đề</h2>
          <div className="flex items-center gap-2 shrink-0">
             <button
                onClick={onExport}
                className="flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 bg-sky-600 hover:bg-sky-700 text-white shadow-md"
                title="Xuất file JSON"
             >
                <DownloadIcon />
                <span className="text-sm font-semibold hidden sm:inline">Xuất JSON</span>
             </button>
             <button
                onClick={onSave}
                disabled={isSaved}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 ${
                    isSaved 
                    ? 'bg-green-500/20 text-green-400 cursor-default' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                }`}
                title={isSaved ? "Đã lưu vào lịch sử" : "Lưu vào lịch sử"}
             >
                {isSaved ? <CheckIcon /> : <SaveIcon />}
                <span className="text-sm font-semibold hidden sm:inline">{isSaved ? 'Đã Lưu' : 'Lưu'}</span>
             </button>
             <CopyButton textToCopy={result.topic} />
          </div>
        </div>
        <p className="text-slate-300 text-lg leading-relaxed">{result.topic}</p>
      </div>

      {/* Suggested Titles Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-sky-400 flex items-center gap-2 mb-4">
              <YoutubeIcon />
              <span>Tiêu Đề Đề Xuất (Gốc)</span>
          </h2>
          <div className="space-y-3">
              {(result.suggestedTitles || []).map((title, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700 group hover:border-sky-500/50 transition-colors">
                      <span className="text-slate-200 font-medium">{title}</span>
                      <CopyButton textToCopy={title} />
                  </div>
              ))}
          </div>
      </div>

      {/* Description Section */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-sky-400 flex items-center gap-2">
                <TextIcon />
                <span>Mô Tả Nội Dung</span>
            </h2>
            <CopyButton textToCopy={result.description} />
          </div>
          <div className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap italic border-l-4 border-sky-500/30 pl-4 py-1 bg-slate-900/30 rounded-r-lg">
            {result.description}
          </div>
      </div>

      {/* Creative Insights Section */}
      {(result.suggestedStyle || result.suggestedTone) && (
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl shadow-lg p-6">
             <h2 className="text-xl font-bold text-indigo-300 mb-4 flex items-center gap-2">
                <TextIcon />
                <span>Gợi Ý Cấu Hình Sáng Tạo</span>
             </h2>
             <p className="text-slate-400 text-sm mb-4">
                Dưới đây là phân tích về phong cách của nội dung gốc. Những thông số này sẽ được tự động áp dụng khi bạn chọn "Chuyển Thành Câu Chuyện".
             </p>
             <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                 {result.suggestedStyle && (
                     <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                         <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Phong Cách</div>
                         <div className="text-indigo-400 font-medium">{STYLE_LABELS[result.suggestedStyle] || result.suggestedStyle}</div>
                     </div>
                 )}
                 {result.suggestedTone && (
                     <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                         <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Giọng Điệu</div>
                         <div className="text-purple-400 font-medium">{TONE_LABELS[result.suggestedTone] || result.suggestedTone}</div>
                     </div>
                 )}
                 {result.suggestedAudience && (
                     <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                         <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Khán Giả</div>
                         <div className="text-sky-400 font-medium">{result.suggestedAudience}</div>
                     </div>
                 )}
                 {result.suggestedPacing && (
                     <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                         <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Nhịp Độ</div>
                         <div className="text-emerald-400 font-medium">{result.suggestedPacing}</div>
                     </div>
                 )}
                 {result.suggestedVoice && (
                     <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex flex-col">
                         <div className="text-xs text-slate-500 uppercase font-semibold mb-1 flex items-center gap-1">
                             <SpeakerIcon /> Giọng Đọc
                         </div>
                         <div className="text-pink-400 font-medium">{result.suggestedVoice}</div>
                     </div>
                 )}
             </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Key Points */}
          <div className="md:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-sky-400">Các Điểm Cốt Lõi</h2>
              <CopyButton textToCopy={keyPointsText} />
            </div>
            <ul className="space-y-3">
              {result.keyPoints.map((point, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-sky-400 mr-3 mt-1 shrink-0"><KeyPointIcon /></span>
                  <span className="text-slate-300">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Hashtags */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-sky-400">Gợi Ý Hashtags</h2>
              <CopyButton textToCopy={hashtagsText} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {result.suggestedHashtags.map((tag, index) => (
                <span 
                    key={index} 
                    className="px-3 py-1.5 bg-sky-900/30 text-sky-400 border border-sky-500/30 rounded-full text-sm font-medium hover:bg-sky-800/50 transition-colors cursor-default"
                >
                    #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
            <p className="mt-auto pt-6 text-[10px] text-slate-500 italic uppercase tracking-wider">
                Tối ưu cho SEO YouTube
            </p>
          </div>
      </div>
      
      {/* Translation Section */}
      <div className="border-t-2 border-slate-700/50 pt-8 mt-8">
         <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-800 p-4 rounded-lg">
            <h3 className="text-xl font-semibold text-slate-300 flex items-center gap-2 flex-shrink-0">
                <TranslateIcon />
                <span>Dịch Kết Quả</span>
            </h3>
            <div className="w-full sm:w-auto flex-grow">
              <LanguageSelector 
                value={targetLanguage}
                onChange={onLanguageChange}
                disabled={isTranslating}
              />
            </div>
            <button
                onClick={onTranslate}
                disabled={isTranslating}
                className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:bg-sky-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:text-slate-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-sky-500"
            >
                {isTranslating ? 'Đang dịch...' : 'Dịch'}
            </button>
        </div>
        {translationError && <div className="mt-4"><ErrorDisplay message={translationError} /></div>}
        {isTranslating && <LoadingSpinner />}
        {translatedResult && !isTranslating && (
          <div className="mt-8 space-y-8 animate-fade-in">
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h2 className="text-2xl font-bold text-green-400">Chủ Đề (Đã dịch)</h2>
                  <CopyButton textToCopy={translatedResult.topic} />
                </div>
                <p className="text-slate-300 text-lg">{translatedResult.topic}</p>
              </div>

              {/* Translated Titles */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2 mb-4">
                      <YoutubeIcon />
                      <span>Tiêu Đề Đề Xuất (Đã dịch)</span>
                  </h2>
                  <div className="space-y-3">
                      {(translatedResult.suggestedTitles || []).map((title, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700 group hover:border-green-500/50 transition-colors">
                              <span className="text-slate-200 font-medium">{title}</span>
                              <CopyButton textToCopy={title} />
                          </div>
                      ))}
                  </div>
              </div>

              {/* Translated Description */}
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
                        <TextIcon />
                        <span>Mô Tả Nội Dung (Đã dịch)</span>
                    </h2>
                    <CopyButton textToCopy={translatedResult.description} />
                  </div>
                  <div className="text-slate-300 text-base leading-relaxed whitespace-pre-wrap italic border-l-4 border-green-500/30 pl-4 py-1 bg-slate-900/30 rounded-r-lg">
                    {translatedResult.description}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Translated Key Points */}
                  <div className="md:col-span-2 bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <h2 className="text-2xl font-bold text-green-400">Các Điểm Cốt Lõi (Đã dịch)</h2>
                      <CopyButton textToCopy={translatedKeyPointsText} />
                    </div>
                    <ul className="space-y-3">
                      {translatedResult.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-400 mr-3 mt-1"><KeyPointIcon /></span>
                          <span className="text-slate-300">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Translated Hashtags */}
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-bold text-green-400">Hashtags (Dịch)</h2>
                      <CopyButton textToCopy={translatedHashtagsText} />
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {translatedResult.suggestedHashtags.map((tag, index) => (
                        <span 
                            key={index} 
                            className="px-3 py-1.5 bg-green-900/30 text-green-400 border border-green-500/30 rounded-full text-sm font-medium hover:bg-green-800/50 transition-colors cursor-default"
                        >
                            #{tag.replace(/^#/, '')}
                        </span>
                      ))}
                    </div>
                  </div>
              </div>

               <div className="text-center pt-4">
                    <button
                        onClick={onGoToScriptWriter}
                        disabled={!translatedResult}
                        className="inline-flex items-center gap-3 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500"
                    >
                        <ScriptIcon />
                        Chuyển Thành Câu Chuyện
                    </button>
                </div>
          </div>
        )}
      </div>
    </div>
  );
};

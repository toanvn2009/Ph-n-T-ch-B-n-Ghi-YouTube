import React, { useState, useCallback, useEffect } from 'react';
import { analyzeTranscript, translateResult } from './services/geminiService';
import type { AnalysisResult, SavedAnalysis, ScriptData, AudioVersion } from './types';
import { Header } from './components/Header';
import { TranscriptInput, InputMode } from './components/TranscriptInput';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { ScriptWriter } from './components/ScriptWriter';
import { HistoryPanel } from './components/HistoryPanel';

type View = 'main' | 'scriptWriter';

interface ScriptWriterInputState {
    result: AnalysisResult;
    language: string;
    initialData?: {
        scriptData?: ScriptData | null;
        translatedScriptData?: ScriptData | null;
        audioCache?: Record<string, AudioVersion[]>;
    }
}

const App: React.FC = () => {
  const [view, setView] = useState<View>('main');
  
  // Input State
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [transcript, setTranscript] = useState<string>('');
  const [fileData, setFileData] = useState<{ name: string; type: string; data: string } | null>(null);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [translatedResult, setTranslatedResult] = useState<AnalysisResult | null>(null);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('Vietnamese');

  const [scriptWriterInput, setScriptWriterInput] = useState<ScriptWriterInputState | null>(null);

  // History State
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isCurrentAnalysisSaved, setIsCurrentAnalysisSaved] = useState<boolean>(false);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('yt_analyzer_history');
    if (saved) {
      try {
        setSavedAnalyses(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToStorage = (items: SavedAnalysis[]) => {
    localStorage.setItem('yt_analyzer_history', JSON.stringify(items));
    setSavedAnalyses(items);
  };

  const handleAnalyze = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setTranslatedResult(null);
    setTranslationError(null);
    setIsCurrentAnalysisSaved(false);
    // Reset script writer input when analyzing new content
    setScriptWriterInput(null);

    try {
      let analysis;
      if (inputMode === 'text') {
        if (!transcript.trim()) throw new Error("Vui lòng nhập nội dung.");
        analysis = await analyzeTranscript({ type: 'text', content: transcript });
      } else if (inputMode === 'file') {
        if (!fileData) throw new Error("Vui lòng chọn file.");
        analysis = await analyzeTranscript({ type: 'file', mimeType: fileData.type, data: fileData.data });
      } else {
          // Fallback if somehow triggered
          throw new Error("Chế độ chưa được hỗ trợ.");
      }
      
      setResult(analysis);

      // Auto-detect and pre-select language
      if (analysis.language) {
         setTargetLanguage(analysis.language);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [transcript, fileData, inputMode]);

  const handleTranslate = useCallback(async () => {
    if (!result) return;
    setIsTranslating(true);
    setTranslationError(null);
    setTranslatedResult(null);
    setIsCurrentAnalysisSaved(false); 
    try {
        const translation = await translateResult(result, targetLanguage);
        setTranslatedResult(translation);
    } catch (err)
 {
        console.error(err);
        setTranslationError('Không thể dịch kết quả. Vui lòng thử lại.');
    } finally {
        setIsTranslating(false);
    }
  }, [result, targetLanguage]);

  const handleSaveAnalysis = useCallback(() => {
    if (!result) return;
    
    // Store a simplified reference for file/text
    const contentPreview = inputMode === 'text' 
        ? transcript 
        : `[File: ${fileData?.name || 'Video/Audio'}]`;

    const newSave: SavedAnalysis = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        transcript: contentPreview,
        result,
        translatedResult,
        targetLanguage
    };
    
    const updated = [newSave, ...savedAnalyses];
    saveToStorage(updated);
    setIsCurrentAnalysisSaved(true);
  }, [result, transcript, fileData, inputMode, translatedResult, targetLanguage, savedAnalyses]);

  const handleDeleteSaved = useCallback((id: string) => {
    const updated = savedAnalyses.filter(item => item.id !== id);
    saveToStorage(updated);
  }, [savedAnalyses]);

  const handleLoadSaved = useCallback((item: SavedAnalysis) => {
    // Note: We can't fully restore the File object, so we switch to text mode with the preview or just show results
    setTranscript(item.transcript);
    setInputMode('text'); // Default back to text view for history items
    setFileData(null);
    
    setResult(item.result);
    setTranslatedResult(item.translatedResult);
    setTargetLanguage(item.targetLanguage);
    setIsCurrentAnalysisSaved(true);
    setIsHistoryOpen(false);
    
    if (item.scriptData) {
        setScriptWriterInput({
            result: item.translatedResult || item.result,
            language: item.targetLanguage,
            initialData: {
                scriptData: item.scriptData,
                translatedScriptData: item.translatedScriptData
            }
        });
        setView('scriptWriter');
    } else {
        setView('main');
        setScriptWriterInput(null);
    }
    
    setError(null);
  }, []);

  const downloadJson = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = useCallback(() => {
    if (!result) return;
     const contentPreview = inputMode === 'text' 
        ? transcript 
        : `[File: ${fileData?.name || 'Video/Audio'}]`;

    const data: SavedAnalysis = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        transcript: contentPreview,
        result,
        translatedResult,
        targetLanguage
    };
    downloadJson(data, `phan-tich-${new Date().toISOString().slice(0,10)}.json`);
  }, [result, transcript, fileData, inputMode, translatedResult, targetLanguage]);

  const handleScriptExport = useCallback((scriptData: ScriptData | null, translatedScriptData: ScriptData | null) => {
    if (!result) return;
    const contentPreview = inputMode === 'text' 
        ? transcript 
        : `[File: ${fileData?.name || 'Video/Audio'}]`;

    const data: SavedAnalysis = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        transcript: contentPreview,
        result,
        translatedResult,
        targetLanguage,
        scriptData,
        translatedScriptData
    };
    downloadJson(data, `cau-chuyen-ai-${new Date().toISOString().slice(0,10)}.json`);
  }, [result, transcript, fileData, inputMode, translatedResult, targetLanguage]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const content = event.target?.result as string;
            const data = JSON.parse(content) as SavedAnalysis;
            
            if (data.result && data.result.topic) {
                setTranscript(data.transcript || '');
                setFileData(null);
                setInputMode('text');
                setResult(data.result);
                setTranslatedResult(data.translatedResult);
                setTargetLanguage(data.targetLanguage);
                setIsCurrentAnalysisSaved(false);
                setError(null);

                if (data.scriptData) {
                    setScriptWriterInput({
                        result: data.translatedResult || data.result,
                        language: data.targetLanguage,
                        initialData: {
                            scriptData: data.scriptData,
                            translatedScriptData: data.translatedScriptData
                        }
                    });
                    setView('scriptWriter');
                } else {
                    setView('main');
                    setScriptWriterInput(null);
                }
            } else {
                setError('File JSON không đúng định dạng.');
            }
        } catch (err) {
            console.error(err);
            setError('Lỗi khi đọc file.');
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  }, []);

  const handleGoToScriptWriter = useCallback(() => {
    if (!translatedResult) return;
    
    // Check if we have active input matching the current result to preserve state (from Back button)
    if (scriptWriterInput?.result === translatedResult) {
         setView('scriptWriter');
         return;
    }

    setScriptWriterInput({ result: translatedResult, language: targetLanguage });
    setView('scriptWriter');
  }, [translatedResult, targetLanguage, scriptWriterInput]);
  
  const handleBackToMain = useCallback((data?: { 
      scriptData: ScriptData | null, 
      translatedScriptData: ScriptData | null, 
      audioCache: Record<string, AudioVersion[]> 
  }) => {
    // If data comes back, we update the input state so next time we open writer, it's there
    if (data && scriptWriterInput) {
        setScriptWriterInput(prev => prev ? {
            ...prev,
            initialData: data
        } : null);
    }
    setView('main');
  }, [scriptWriterInput]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-4xl mx-auto">
        {view === 'main' ? (
          <>
             <Header onOpenHistory={() => setIsHistoryOpen(true)} onImport={handleImport} />
             <main className="mt-8">
               <TranscriptInput
                 mode={inputMode}
                 setMode={setInputMode}
                 textData={transcript}
                 onTextChange={(val) => {
                    setTranscript(val);
                    if (isCurrentAnalysisSaved) setIsCurrentAnalysisSaved(false);
                 }}
                 fileData={fileData}
                 onFileChange={(file) => {
                    setFileData(file);
                    if (isCurrentAnalysisSaved) setIsCurrentAnalysisSaved(false);
                 }}
                 onAnalyze={handleAnalyze}
                 isLoading={isLoading}
               />
     
               {error && <ErrorDisplay message={error} />}
     
               {isLoading && <LoadingSpinner />}
     
               {result && !isLoading && (
                 <div className="mt-8 animate-fade-in">
                   <ResultDisplay
                     result={result}
                     translatedResult={translatedResult}
                     onTranslate={handleTranslate}
                     isTranslating={isTranslating}
                     targetLanguage={targetLanguage}
                     onLanguageChange={setTargetLanguage}
                     translationError={translationError}
                     onGoToScriptWriter={handleGoToScriptWriter}
                     onSave={handleSaveAnalysis}
                     isSaved={isCurrentAnalysisSaved}
                     onExport={handleExport}
                   />
                 </div>
               )}
             </main>
          </>
        ) : (
             scriptWriterInput && (
                <ScriptWriter 
                    input={scriptWriterInput} 
                    onBack={handleBackToMain} 
                    onExport={handleScriptExport}
                />
             )
        )}
      </div>

      <HistoryPanel 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)}
        savedItems={savedAnalyses}
        onLoad={handleLoadSaved}
        onDelete={handleDeleteSaved}
      />
    </div>
  );
};

export default App;
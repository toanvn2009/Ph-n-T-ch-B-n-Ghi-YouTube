import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import { analyzeTranscript, translateResult, analyzeVideoSegmentation } from './services/geminiService';
import { downloadJson } from './utils/downloadUtils';
import { useAnalysisHistory } from './hooks/useAnalysisHistory';
import { useWorkingState } from './hooks/useWorkingState';
import type { AnalysisResult, SavedAnalysis, ScriptData } from './types';
import { Header } from './components/Header';
import { TranscriptInput, InputMode } from './components/TranscriptInput';
import { ResultDisplay } from './components/ResultDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorDisplay } from './components/ErrorDisplay';
import { HistoryPanel } from './components/HistoryPanel';

// ScriptWriter is heavy (audio player, TTS, all creative configs) → lazy chunk
const ScriptWriter = lazy(() =>
  import('./components/ScriptWriter').then(m => ({ default: m.ScriptWriter }))
);

type View = 'main' | 'scriptWriter';

interface ScriptWriterInputState {
  result: AnalysisResult;
  language: string;
  analysisId?: string;
  initialData?: {
    scriptData?: ScriptData | null;
    translatedScriptData?: ScriptData | null;
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

  // Video segmentation (deep shot-list analysis)
  const [isSegmenting, setIsSegmenting] = useState<boolean>(false);
  const [segmentationError, setSegmentationError] = useState<string | null>(null);

  const [scriptWriterInput, setScriptWriterInput] = useState<ScriptWriterInputState | null>(null);
  // Stable session ID for current analysis — keys IndexedDB audio cache.
  // Created on each new analyze; reused when loading a saved item (= item.id).
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // UI-only state (history panel)
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isCurrentAnalysisSaved, setIsCurrentAnalysisSaved] = useState<boolean>(false);

  // History (localStorage + IndexedDB cleanup) lives in its own hook now
  const { savedAnalyses, saveAnalysis, deleteAnalysis } = useAnalysisHistory();

  // ====== Working state auto-save (F5 / reload protection) ======
  // Build a stable snapshot via useMemo so persist effect only fires when fields actually change.
  const workingSnapshot = useMemo(() => ({
    view,
    inputMode,
    transcript,
    result,
    translatedResult,
    targetLanguage,
    scriptWriterInput,
    currentSessionId,
    isCurrentAnalysisSaved,
  }), [view, inputMode, transcript, result, translatedResult, targetLanguage, scriptWriterInput, currentSessionId, isCurrentAnalysisSaved]);

  const isWorkingSnapshotEmpty =
    !result && !translatedResult && !transcript.trim() && !scriptWriterInput && !currentSessionId;

  const handleRestoreWorkingState = useCallback((ws: typeof workingSnapshot) => {
    if (ws.inputMode) setInputMode(ws.inputMode);
    if (typeof ws.transcript === 'string') setTranscript(ws.transcript);
    if (ws.result) setResult(ws.result);
    if (ws.translatedResult) setTranslatedResult(ws.translatedResult);
    if (ws.targetLanguage) setTargetLanguage(ws.targetLanguage);
    if (ws.scriptWriterInput) setScriptWriterInput(ws.scriptWriterInput);
    if (ws.currentSessionId) setCurrentSessionId(ws.currentSessionId);
    if (typeof ws.isCurrentAnalysisSaved === 'boolean') setIsCurrentAnalysisSaved(ws.isCurrentAnalysisSaved);
    // Restore view last so ScriptWriter mount has its input ready
    if (ws.view === 'scriptWriter' && ws.scriptWriterInput) setView('scriptWriter');
  }, []);

  useWorkingState({
    storageKey: 'yt_analyzer_working_state',
    snapshot: workingSnapshot,
    isEmpty: isWorkingSnapshotEmpty,
    onRestore: handleRestoreWorkingState,
  });

  // Protect against data loss when closing tab with unsaved work
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (result && !isCurrentAnalysisSaved) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [result, isCurrentAnalysisSaved]);

  const handleAnalyze = useCallback(async () => {
    const t0 = performance.now();
    console.info('[ANALYZE] start', { inputMode, transcriptLen: transcript.length, hasFile: !!fileData });
    setIsLoading(true);
    setError(null);
    setResult(null);
    setTranslatedResult(null);
    setTranslationError(null);
    setIsCurrentAnalysisSaved(false);
    // Reset script writer input when analyzing new content
    setScriptWriterInput(null);
    // Fresh session ID for the new analysis (used as IndexedDB key)
    setCurrentSessionId(Date.now().toString());

    try {
      let analysis;
      if (inputMode === 'text') {
        if (!transcript.trim()) throw new Error("Vui lòng nhập nội dung.");
        analysis = await analyzeTranscript({ type: 'text', content: transcript });
      } else if (inputMode === 'file') {
        if (!fileData) throw new Error("Vui lòng chọn file.");
        analysis = await analyzeTranscript({ type: 'file', mimeType: fileData.type, data: fileData.data });
      } else {
        throw new Error("Chế độ chưa được hỗ trợ.");
      }

      console.info('[ANALYZE] done', { ms: Math.round(performance.now() - t0), topic: analysis.topic, lang: analysis.language });
      setResult(analysis);

      if (analysis.language) {
        setTargetLanguage(analysis.language);
      }
    } catch (err: any) {
      console.error('[ANALYZE] error', { ms: Math.round(performance.now() - t0), err });
      setError(err.message || 'Đã xảy ra lỗi khi phân tích. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [transcript, fileData, inputMode]);

  const handleAnalyzeSegmentation = useCallback(async () => {
    if (!fileData || !result) return;
    const t0 = performance.now();
    console.info('[SEGMENT] start', { fileName: fileData.name });
    setIsSegmenting(true);
    setSegmentationError(null);
    try {
      const segmentation = await analyzeVideoSegmentation({
        mimeType: fileData.type,
        data: fileData.data,
      });
      console.info('[SEGMENT] done', {
        ms: Math.round(performance.now() - t0),
        segments: segmentation.segments.length,
      });
      setResult(prev => prev ? { ...prev, videoSegmentation: segmentation } : prev);
      setIsCurrentAnalysisSaved(false);
    } catch (err: any) {
      console.error('[SEGMENT] error', { ms: Math.round(performance.now() - t0), err });
      setSegmentationError(err.message || 'Không thể phân tích phân cảnh video.');
    } finally {
      setIsSegmenting(false);
    }
  }, [fileData, result]);

  const handleTranslate = useCallback(async () => {
    if (!result) return;
    const t0 = performance.now();
    console.info('[TRANSLATE] start', { targetLanguage, topic: result.topic });
    setIsTranslating(true);
    setTranslationError(null);
    setTranslatedResult(null);
    setIsCurrentAnalysisSaved(false);
    try {
      const translation = await translateResult(result, targetLanguage);
      console.info('[TRANSLATE] done', { ms: Math.round(performance.now() - t0), topic: translation.topic });
      setTranslatedResult(translation);
    } catch (err) {
      console.error('[TRANSLATE] error', { ms: Math.round(performance.now() - t0), err });
      setTranslationError('Không thể dịch kết quả. Vui lòng thử lại.');
    } finally {
      setIsTranslating(false);
    }
  }, [result, targetLanguage]);

  // Build a short reference to current input content (text or filename) for history/export.
  const getContentPreview = useCallback(
    () => (inputMode === 'text' ? transcript : `[File: ${fileData?.name || 'Video/Audio'}]`),
    [inputMode, transcript, fileData]
  );

  const handleSaveAnalysis = useCallback(() => {
    if (!result) return;

    // Reuse current session ID so audio cache (IndexedDB) stays attached to this entry.
    const sessionId = currentSessionId || Date.now().toString();
    if (!currentSessionId) setCurrentSessionId(sessionId);

    const newSave: SavedAnalysis = {
      id: sessionId,
      timestamp: Date.now(),
      transcript: getContentPreview(),
      result,
      translatedResult,
      targetLanguage
    };

    if (saveAnalysis(newSave)) {
      setIsCurrentAnalysisSaved(true);
    } else {
      setError('Không đủ dung lượng lưu lịch sử. Hãy xóa bớt các mục cũ trong History.');
      setIsCurrentAnalysisSaved(false);
    }
  }, [result, currentSessionId, translatedResult, targetLanguage, getContentPreview, saveAnalysis]);

  const handleDeleteSaved = useCallback((id: string) => {
    deleteAnalysis(id);
  }, [deleteAnalysis]);

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
    // Reuse the saved item's id as session id so we hit the same IndexedDB cache
    setCurrentSessionId(item.id);

    if (item.scriptData) {
      setScriptWriterInput({
        result: item.translatedResult || item.result,
        language: item.targetLanguage,
        analysisId: item.id,
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

  const handleExport = useCallback(() => {
    if (!result) return;
    const data: SavedAnalysis = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      transcript: getContentPreview(),
      result,
      translatedResult,
      targetLanguage
    };
    downloadJson(data, `phan-tich-${new Date().toISOString().slice(0, 10)}.json`);
  }, [result, translatedResult, targetLanguage, getContentPreview]);

  const handleScriptExport = useCallback((scriptData: ScriptData | null, translatedScriptData: ScriptData | null) => {
    if (!result) return;
    const data: SavedAnalysis = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      transcript: getContentPreview(),
      result,
      translatedResult,
      targetLanguage,
      scriptData,
      translatedScriptData
    };
    downloadJson(data, `cau-chuyen-ai-${new Date().toISOString().slice(0, 10)}.json`);
  }, [result, translatedResult, targetLanguage, getContentPreview]);

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
          // Imported entry → fresh session ID (no IDB cache exists for it yet)
          const importedSessionId = data.id || Date.now().toString();
          setCurrentSessionId(importedSessionId);

          if (data.scriptData) {
            setScriptWriterInput({
              result: data.translatedResult || data.result,
              language: data.targetLanguage,
              analysisId: importedSessionId,
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

    setScriptWriterInput({
      result: translatedResult,
      language: targetLanguage,
      analysisId: currentSessionId || undefined
    });
    setView('scriptWriter');
  }, [translatedResult, targetLanguage, scriptWriterInput, currentSessionId]);

  const handleBackToMain = useCallback((data?: {
    scriptData: ScriptData | null,
    translatedScriptData: ScriptData | null,
  }) => {
    // Preserve script content for next ScriptWriter open (audio cache lives in IndexedDB now)
    if (data && scriptWriterInput) {
      setScriptWriterInput(prev => prev ? {
        ...prev,
        initialData: data
      } : null);
    }
    setView('main');
  }, [scriptWriterInput]);

  // Live-sync ScriptWriter local state up so F5 inside ScriptWriter doesn't lose generated story
  const handleScriptUpdate = useCallback((data: {
    scriptData: ScriptData | null,
    translatedScriptData: ScriptData | null,
  }) => {
    setScriptWriterInput(prev => prev ? { ...prev, initialData: data } : prev);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl mx-auto">
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
                    canSegmentVideo={(inputMode === 'file' && !!fileData) || !!result.videoSegmentation}
                    onAnalyzeSegmentation={handleAnalyzeSegmentation}
                    isSegmenting={isSegmenting}
                    segmentationError={segmentationError}
                  />
                </div>
              )}
            </main>
          </>
        ) : (
          scriptWriterInput && (
            <Suspense fallback={<LoadingSpinner />}>
              <ScriptWriter
                input={scriptWriterInput}
                onBack={handleBackToMain}
                onExport={handleScriptExport}
                onScriptUpdate={handleScriptUpdate}
              />
            </Suspense>
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
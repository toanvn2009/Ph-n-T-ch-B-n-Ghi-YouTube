
export interface ScriptMetadata {
    titles: string[];
    description: string;
    hashtags: string[];
}

export interface ScriptData {
    parts: string[];
    metadata: ScriptMetadata;
}

// Moved AudioVersion here to be shared
export interface AudioVersion {
    id: string;
    voiceValue: string;
    voiceLabel: string;
    data: string; // base64
    speed: number; // Playback speed (e.g., 1.0, 1.25, 0.75)
    createdAt: number;
}

export interface AnalysisResult {
  topic: string;
  suggestedTitles: string[]; // Added suggested titles array
  description: string;
  keyPoints: string[];
  suggestedHashtags: string[];
  language: string;
  // New fields for Creative Configuration Suggestions
  suggestedStyle?: string;
  suggestedTone?: string;
  suggestedAudience?: string;
  suggestedPacing?: string;
  suggestedVoice?: string;
  // New fields for Structure Suggestions
  suggestedDuration?: number; // in minutes
  suggestedParts?: number;
}

export interface SavedAnalysis {
  id: string;
  timestamp: number;
  transcript: string;
  result: AnalysisResult;
  translatedResult: AnalysisResult | null;
  targetLanguage: string;
  scriptData?: ScriptData | null;
  translatedScriptData?: ScriptData | null;
}

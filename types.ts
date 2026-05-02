
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
    duration?: number; // Thời lượng (giây)
    createdAt: number;
}

export interface VideoShot {
  index: number;        // 1-based ordering inside its segment
  timeRange?: string;   // e.g. "00:08 - 00:16"
  description: string;  // Vietnamese, specific visual/audio action in this shot
}

export interface VideoSegment {
  index: number;          // 1-based segment number
  title: string;          // e.g. "Buổi sáng & Bữa sáng"
  timeRange: string;      // e.g. "00:00 - 01:30"
  content: string;        // "Nội dung" — what happens in the segment
  mood: string;           // "Không khí" — Thư thái / Bình yên...
  shots: VideoShot[];     // detailed shot list (~8-10s each)
}

export interface VideoSegmentation {
  totalSegments: number;
  pacingNote: string;     // e.g. "Mỗi phân cảnh ~8-10s, ASMR/Slow Living"
  segments: VideoSegment[];
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
  // Optional video-only deep analysis (segments + shots)
  videoSegmentation?: VideoSegmentation;
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

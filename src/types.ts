/**
 * TypeScript interfaces and types for Simple Transcriptor
 */

export interface TranscriptionSession {
  id: string;
  filename: string;
  uploadTimestamp: string;
  status: "queued" | "processing" | "completed" | "error";
  assemblyaiId?: string;
  transcriptionResults?: AssemblyAIResults;
  jbaResults?: JBADetectionResult[];
  videoUrl?: string;
  errorMessage?: string;
}

export interface AssemblyAIResults {
  id: string;
  status: string;
  text: string;
  confidence: number;
  words: Word[];
  chapters?: Chapter[];
}

export interface Word {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string | null;
}

export interface Chapter {
  summary: string;
  headline: string;
  gist: string;
  start: number;
  end: number;
}

export interface JBADetectionResult {
  code: string;
  originalText: string;
  context: string;
  timestamp: number;
  confidence: number;
  variationType:
    | "standard"
    | "spaced"
    | "dotted"
    | "hyphenated"
    | "lowercase"
    | "spoken"
    | "extended";
}

export interface SessionStorage {
  sessions: TranscriptionSession[];
  lastUpdated: string;
}

export interface VideoMetadata {
  videoId: string;
  originalFilename: string;
  filePath: string;
  contentType: string;
  size: number;
  uploadTimestamp: string;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface TranscribeRequest {
  sessionId: string;
  filename: string;
  filePath: string;
  contentType: string;
  size: number;
}

export interface HealthCheckResponse {
  status: "OK" | "ERROR";
  timestamp: string;
  services: {
    assemblyai: boolean;
    fileSystem: boolean;
    sessions: boolean;
  };
}

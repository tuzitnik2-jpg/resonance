export type AnalysisType =
  "MEANING" | "STYLE" | "MOOD_ENERGY" | "DANCE" | "REELS" | "FESTIVAL" | "COLLECTION";

export interface AnalyzeSongInput {
  analysisType: AnalysisType;
  /** System/developer instructions — normally the active PromptVersion for this type. */
  instructions: string;
  song: {
    title: string;
    artistName: string;
    albumTitle?: string;
    releaseYear?: number;
    existingTags: string[];
    userNote?: string;
  };
}

export interface AnalysisSource {
  title: string;
  url?: string;
}

export interface AnalysisResult {
  summary: string;
  structuredData: Record<string, unknown>;
  confidence?: number;
  sources?: AnalysisSource[];
  model: string;
}

export interface AnswerQueryInput {
  question: string;
  /** A compact text summary of the user's library for grounding the answer. */
  libraryContext: string;
}

export interface AIProvider {
  analyzeSong(input: AnalyzeSongInput): Promise<AnalysisResult>;
  answer(input: AnswerQueryInput): Promise<string>;
}

/** Thrown when a provider is asked to act but isn't configured (e.g. no API key). */
export class AIProviderUnavailableError extends Error {}

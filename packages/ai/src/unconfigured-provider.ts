import {
  AIProviderUnavailableError,
  type AIProvider,
  type AnalysisResult,
  type AnalyzeSongInput,
} from "./types";

/** Used when no AI provider is configured (e.g. OPENAI_API_KEY unset in local dev). */
export class UnconfiguredProvider implements AIProvider {
  async analyzeSong(_input: AnalyzeSongInput): Promise<AnalysisResult> {
    throw new AIProviderUnavailableError(
      "No AI provider is configured. Set OPENAI_API_KEY to enable AI-generated analyses.",
    );
  }
}

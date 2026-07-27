import { OpenAIProvider } from "./openai-provider";
import type { AIProvider } from "./types";
import { UnconfiguredProvider } from "./unconfigured-provider";

/** Picks the AI provider based on environment config (ADR-0008: providers are swappable). */
export function createAIProvider(env: NodeJS.ProcessEnv = process.env): AIProvider {
  if (env.OPENAI_API_KEY) {
    return new OpenAIProvider({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL });
  }
  return new UnconfiguredProvider();
}

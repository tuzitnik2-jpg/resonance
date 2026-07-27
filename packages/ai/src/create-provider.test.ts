import { describe, expect, it } from "vitest";
import { createAIProvider } from "./create-provider";
import { OpenAIProvider } from "./openai-provider";
import { UnconfiguredProvider } from "./unconfigured-provider";
import { AIProviderUnavailableError } from "./types";
import { buildInstructions, DEFAULT_ASSISTANT_INSTRUCTIONS } from "./prompts";

describe("createAIProvider", () => {
  it("returns an UnconfiguredProvider when OPENAI_API_KEY is unset", () => {
    const provider = createAIProvider({});
    expect(provider).toBeInstanceOf(UnconfiguredProvider);
  });

  it("returns an OpenAIProvider when OPENAI_API_KEY is set", () => {
    const provider = createAIProvider({ OPENAI_API_KEY: "sk-test" } as NodeJS.ProcessEnv);
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });
});

describe("UnconfiguredProvider", () => {
  it("throws a clear, typed error instead of fabricating an analysis", async () => {
    const provider = new UnconfiguredProvider();
    await expect(
      provider.analyzeSong({
        analysisType: "MEANING",
        instructions: "irrelevant",
        song: { title: "Destiny", artistName: "Queen Omega", existingTags: [] },
      }),
    ).rejects.toBeInstanceOf(AIProviderUnavailableError);
  });
});

describe("buildInstructions", () => {
  it("appends the per-analysis-type task to the base instructions", () => {
    const result = buildInstructions("DANCE", DEFAULT_ASSISTANT_INSTRUCTIONS);
    expect(result).toContain(DEFAULT_ASSISTANT_INSTRUCTIONS);
    expect(result).toContain("groove");
  });
});

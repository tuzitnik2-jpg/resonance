import type { AIProvider, AnalysisResult, AnalyzeSongInput } from "./types";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    structuredData: { type: "object", additionalProperties: true },
    confidence: { type: "number" },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, url: { type: "string" } },
        required: ["title"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "structuredData"],
  additionalProperties: false,
};

export interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

/**
 * Calls the OpenAI Responses API (POST /v1/responses) with a JSON-schema-constrained
 * output so the result maps directly onto a SongAnalysis row.
 *
 * NOTE: the exact request/response shape of the Responses API can change between OpenAI
 * releases (see source design doc, Appendix D). Verify against current OpenAI docs before
 * relying on this in production — this was last checked in July 2026.
 */
export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? "gpt-5.1";
    this.baseUrl = options.baseUrl ?? "https://api.openai.com/v1";
  }

  async analyzeSong(input: AnalyzeSongInput): Promise<AnalysisResult> {
    const userMessage = [
      `Song: "${input.song.title}" by ${input.song.artistName}`,
      input.song.albumTitle ? `Album: ${input.song.albumTitle}` : null,
      input.song.releaseYear ? `Release year: ${input.song.releaseYear}` : null,
      input.song.existingTags.length
        ? `Existing tags: ${input.song.existingTags.join(", ")}`
        : null,
      input.song.userNote ? `User's own note: ${input.song.userNote}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch(`${this.baseUrl}/responses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: [
          { role: "developer", content: input.instructions },
          { role: "user", content: userMessage },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "song_analysis",
            schema: RESPONSE_SCHEMA,
            strict: true,
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI Responses API request failed (${res.status}): ${body}`);
    }

    const data = (await res.json()) as {
      output_text?: string;
      output?: { content?: { type: string; text?: string }[] }[];
    };

    const rawText =
      data.output_text ??
      data.output?.flatMap((item) => item.content ?? []).find((c) => c.type === "output_text")
        ?.text;

    if (!rawText) {
      throw new Error("OpenAI response did not include any output text.");
    }

    const parsed = JSON.parse(rawText) as {
      summary: string;
      structuredData: Record<string, unknown>;
      confidence?: number;
      sources?: { title: string; url?: string }[];
    };

    return { ...parsed, model: this.model };
  }
}

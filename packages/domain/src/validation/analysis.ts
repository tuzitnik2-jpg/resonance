import { z } from "zod";

export const analysisTypeSchema = z.enum([
  "MEANING",
  "STYLE",
  "MOOD_ENERGY",
  "DANCE",
  "REELS",
  "FESTIVAL",
  "COLLECTION",
]);

export const proposeSongAnalysisSchema = z.object({
  analysisType: analysisTypeSchema,
  summary: z.string().max(4000).optional(),
  structuredData: z.record(z.unknown()),
  confidence: z.number().min(0).max(1).optional(),
  sources: z.array(z.object({ title: z.string(), url: z.string().url().optional() })).optional(),
  model: z.string().optional(),
  promptVersion: z.string().optional(),
});
export type ProposeSongAnalysisInput = z.infer<typeof proposeSongAnalysisSchema>;

export const reviewAnalysisSchema = z.object({
  decision: z.enum(["approve", "reject"]),
});
export type ReviewAnalysisInput = z.infer<typeof reviewAnalysisSchema>;

export const generateSongAnalysisSchema = z.object({
  analysisType: analysisTypeSchema,
});
export type GenerateSongAnalysisInput = z.infer<typeof generateSongAnalysisSchema>;

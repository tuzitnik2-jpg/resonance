import { z } from "zod";

export const analyzeImportSchema = z.object({
  filename: z.string().min(1).max(300),
  csvContent: z.string().min(1),
});
export type AnalyzeImportInput = z.infer<typeof analyzeImportSchema>;

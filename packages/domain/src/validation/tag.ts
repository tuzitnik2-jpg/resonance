import { z } from "zod";

export const tagCategorySchema = z.enum(["GENRE", "THEME", "MOOD", "DANCE", "USAGE", "LANGUAGE"]);

export const attachTagSchema = z.object({
  tagId: z.string().uuid(),
});
export type AttachTagInput = z.infer<typeof attachTagSchema>;

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(100),
  category: tagCategorySchema,
  description: z.string().max(1000).optional(),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
});
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

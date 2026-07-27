import { z } from "zod";

/** Criteria for a smart (auto-updating) playlist. */
export const smartPlaylistRulesSchema = z.object({
  minRating: z.number().int().min(1).max(10).optional(),
  favorite: z.boolean().optional(),
  tagId: z.string().uuid().optional(),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export type SmartPlaylistRules = z.infer<typeof smartPlaylistRulesSchema>;

export const createPlaylistSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().max(50).default("collection"),
  description: z.string().max(2000).optional(),
  externalUrl: z.string().url().optional(),
  rulesJson: smartPlaylistRulesSchema.nullable().optional(),
});
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;

export const updatePlaylistSchema = createPlaylistSchema.partial();
export type UpdatePlaylistInput = z.infer<typeof updatePlaylistSchema>;

export const addPlaylistItemSchema = z.object({
  songId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
});
export type AddPlaylistItemInput = z.infer<typeof addPlaylistItemSchema>;

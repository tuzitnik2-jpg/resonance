import { z } from "zod";

export const createPlaylistSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().max(50).default("collection"),
  description: z.string().max(2000).optional(),
  externalUrl: z.string().url().optional(),
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

import { z } from "zod";

export const songStatusSchema = z.enum(["ACTIVE", "ARCHIVED", "WANT_TO_LISTEN"]);

export const extraArtistSchema = z.object({
  artistId: z.string().uuid(),
  role: z.enum(["featured", "producer", "remixer"]).default("featured"),
});

export const createSongSchema = z.object({
  title: z.string().trim().min(1).max(300),
  primaryArtistId: z.string().uuid(),
  albumId: z.string().uuid().optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  releaseMonth: z.number().int().min(1).max(12).optional(),
  releaseDay: z.number().int().min(1).max(31).optional(),
  durationMs: z.number().int().positive().optional(),
  languageCode: z.string().max(10).optional(),
  isrc: z.string().optional(),
  bpm: z.number().int().min(20).max(400).optional(),
  musicalKey: z.string().max(20).optional(),
  label: z.string().max(200).optional(),
  extraArtists: z.array(extraArtistSchema).optional(),
  force: z.boolean().optional(),
});
export type CreateSongInput = z.infer<typeof createSongSchema>;

export const updateSongSchema = createSongSchema
  .omit({ force: true, extraArtists: true })
  .partial();
export type UpdateSongInput = z.infer<typeof updateSongSchema>;

export const updateSongUserDataSchema = z.object({
  rating: z.number().int().min(1).max(10).nullable().optional(),
  energyLevel: z.number().int().min(1).max(10).nullable().optional(),
  favorite: z.boolean().optional(),
  status: songStatusSchema.optional(),
  userNote: z.string().max(4000).nullable().optional(),
  discoveredAt: z.string().datetime().nullable().optional(),
  discoverySource: z.string().max(200).nullable().optional(),
});
export type UpdateSongUserDataInput = z.infer<typeof updateSongUserDataSchema>;

export const searchSongsQuerySchema = z.object({
  query: z.string().optional(),
  artistId: z.string().uuid().optional(),
  albumId: z.string().uuid().optional(),
  tagId: z.string().uuid().optional(),
  favorite: z.coerce.boolean().optional(),
  minRating: z.coerce.number().int().min(1).max(10).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type SearchSongsQuery = z.infer<typeof searchSongsQuerySchema>;

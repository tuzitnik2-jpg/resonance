import { z } from "zod";

export const releaseTypeSchema = z.enum(["SINGLE", "EP", "ALBUM", "COMPILATION"]);

export const createAlbumSchema = z.object({
  artistId: z.string().uuid(),
  title: z.string().trim().min(1).max(300),
  releaseType: releaseTypeSchema.optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),
  releaseMonth: z.number().int().min(1).max(12).optional(),
  releaseDay: z.number().int().min(1).max(31).optional(),
  coverUrl: z.string().url().optional(),
  label: z.string().max(200).optional(),
  force: z.boolean().optional(),
});
export type CreateAlbumInput = z.infer<typeof createAlbumSchema>;

export const updateAlbumSchema = createAlbumSchema.omit({ force: true }).partial();
export type UpdateAlbumInput = z.infer<typeof updateAlbumSchema>;

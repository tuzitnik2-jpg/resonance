import { z } from "zod";

export const artistTypeSchema = z.enum(["PERSON", "GROUP", "OTHER"]);

export const createArtistSchema = z.object({
  canonicalName: z.string().trim().min(1).max(200),
  countryCode: z.string().length(2).optional(),
  artistType: artistTypeSchema.optional(),
  originCity: z.string().max(200).optional(),
  beginDate: z.string().max(40).optional(),
  endDate: z.string().max(40).optional(),
  websiteUrl: z.string().max(500).optional(),
  description: z.string().max(2000).optional(),
  musicbrainzId: z.string().optional(),
  force: z.boolean().optional(),
});
export type CreateArtistInput = z.infer<typeof createArtistSchema>;

export const updateArtistSchema = createArtistSchema.omit({ force: true }).partial();
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>;

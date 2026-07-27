import { z } from "zod";

export const externalLinkProviderSchema = z.enum([
  "spotify",
  "youtube",
  "bandcamp",
  "soundcloud",
  "musicbrainz",
  "website",
]);

export const createExternalLinkSchema = z.object({
  entityType: z.enum(["song", "artist", "album"]),
  entityId: z.string().uuid(),
  provider: externalLinkProviderSchema,
  url: z.string().url(),
  providerId: z.string().optional(),
});
export type CreateExternalLinkInput = z.infer<typeof createExternalLinkSchema>;

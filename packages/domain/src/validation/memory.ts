import { z } from "zod";

export const createMemorySchema = z.object({
  entityType: z.enum(["song", "artist", "album", "festival"]),
  entityId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  body: z.string().max(4000).optional(),
  occurredOn: z.string().date().optional(),
  location: z.string().max(200).optional(),
  visibility: z.enum(["PRIVATE", "SHARED"]).default("PRIVATE"),
});
export type CreateMemoryInput = z.infer<typeof createMemorySchema>;

export const updateMemorySchema = createMemorySchema
  .omit({ entityType: true, entityId: true })
  .partial();
export type UpdateMemoryInput = z.infer<typeof updateMemorySchema>;

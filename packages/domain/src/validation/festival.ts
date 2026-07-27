import { z } from "zod";

export const createFestivalSchema = z.object({
  name: z.string().trim().min(1).max(200),
  city: z.string().max(200).optional(),
  countryCode: z.string().length(2).optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  websiteUrl: z.string().url().optional(),
});
export type CreateFestivalInput = z.infer<typeof createFestivalSchema>;

export const updateFestivalSchema = createFestivalSchema.partial();
export type UpdateFestivalInput = z.infer<typeof updateFestivalSchema>;

export const createFestivalPerformanceSchema = z.object({
  artistId: z.string().uuid(),
  stage: z.string().max(100).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  attended: z.boolean().optional(),
  rating: z.number().int().min(1).max(10).optional(),
  note: z.string().max(2000).optional(),
});
export type CreateFestivalPerformanceInput = z.infer<typeof createFestivalPerformanceSchema>;

export const updateFestivalPerformanceSchema = createFestivalPerformanceSchema
  .omit({ artistId: true })
  .partial();
export type UpdateFestivalPerformanceInput = z.infer<typeof updateFestivalPerformanceSchema>;

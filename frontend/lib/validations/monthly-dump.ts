import { z } from 'zod';

export const monthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const monthlyDumpGridLayoutSchema = z.enum(['2x2', '2x3']);

export const monthlyDumpGridPhotoSchema = z.object({
  id: z.string().min(1),
  content_url: z.string().min(1),
});

export const monthlyDumpSlideSchema = z.object({
  type: z.enum(['image', 'video', 'audio']),
  url: z.string().min(1),
  duration_seconds: z.number().min(0).default(0),
  entry_id: z.string().optional(),
  storage_path: z.string().optional(),
});

export const monthlyDumpResponseSchema = z.object({
  status: z.enum(['completed', 'pending', 'processing', 'failed']),
  slides: z.array(monthlyDumpSlideSchema),
});

export type MonthlyDumpGridLayout = z.infer<typeof monthlyDumpGridLayoutSchema>;
export type MonthlyDumpGridPhoto = z.infer<typeof monthlyDumpGridPhotoSchema>;
export type MonthlyDumpSlide = z.infer<typeof monthlyDumpSlideSchema>;
export type MonthlyDumpResponse = z.infer<typeof monthlyDumpResponseSchema>;

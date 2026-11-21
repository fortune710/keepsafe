import { z } from 'zod';

export const inspirationWeekSchema = z.object({
  start: z.coerce.date(),
  end: z.coerce.date(),
}).refine(({ start, end }) => end >= start, 'End date must not precede start date');

export const spotifyCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(16),
});

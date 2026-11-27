import { z } from 'zod';

export const capsuleEntrySchema = z.object({ id: z.string().uuid(), user_id: z.string().uuid(), diary_id: z.string().uuid() });
export const capsuleDraftSchema = z.discriminatedUnion('revealType', [
  z.object({ revealType: z.literal('date'), unlockAt: z.string().min(1) }),
  z.object({ revealType: z.literal('condition'), conditionLabel: z.string().trim().min(1) }),
]);

import { z } from 'zod';

export const capsuleEntrySchema = z.object({ id: z.string().uuid(), user_id: z.string().uuid(), diary_id: z.string().uuid() });
export const saveOpenedCapsuleSchema = z.object({
  capsuleId: z.string().uuid(),
  diaryId: z.string().uuid(),
  sharing: z.enum(['private', 'everyone', 'friends']),
  friendIds: z.array(z.string().uuid()),
}).refine((value) => value.sharing !== 'friends' || value.friendIds.length > 0);
export const capsuleDraftSchema = z.discriminatedUnion('revealType', [
  z.object({ revealType: z.literal('date'), unlockAt: z.string().min(1) }),
  z.object({ revealType: z.literal('condition'), conditionLabel: z.string().trim().min(1) }),
]);

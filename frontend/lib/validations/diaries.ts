import { z } from 'zod';
import { DIARY_STYLE_IDS } from '@/lib/diary-styles';

export const diaryNameSchema = z
  .string()
  .trim()
  .min(1, 'Give your diary a name.')
  .max(60, 'Diary names can be up to 60 characters.');

export const createDiarySchema = z.object({
  name: diaryNameSchema,
  coverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Choose a cover colour.'),
  style: z.enum(DIARY_STYLE_IDS).default('none'),
});

export type CreateDiaryInput = z.input<typeof createDiarySchema>;

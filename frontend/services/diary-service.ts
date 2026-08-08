import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { createDiarySchema, type CreateDiaryInput } from '@/lib/validations/diaries';
import { Database } from '@/types/database';

type Diary = Database['public']['Tables']['diaries']['Row'];

export class DiaryService {
  static async getDiaries(userId: string): Promise<Diary[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from(TABLES.DIARIES)
      .select('id, user_id, name, color, cover_color, style, is_default, created_at')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  static async createDiary(userId: string, input: CreateDiaryInput): Promise<Diary> {
    const values = createDiarySchema.parse(input);
    const { data, error } = await supabase
      .from(TABLES.DIARIES)
      .insert({
        user_id: userId,
        name: values.name,
        color: values.coverColor,
        cover_color: values.coverColor,
        style: values.style,
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Diary;
  }

  static async updateDiary(
    userId: string,
    diaryId: string,
    input: CreateDiaryInput,
  ): Promise<Diary> {
    const values = createDiarySchema.parse(input);
    const { data, error } = await supabase
      .from(TABLES.DIARIES)
      .update({
        name: values.name,
        color: values.coverColor,
        cover_color: values.coverColor,
        style: values.style,
      } as never)
      .eq('id', diaryId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Diary;
  }
}

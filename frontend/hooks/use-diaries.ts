import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/providers/auth-provider';
import { DiaryService } from '@/services/diary-service';
import { createDiarySchema, type CreateDiaryInput } from '@/lib/validations/diaries';
import { Database } from '@/types/database';
import { deviceStorage } from '@/services/device-storage';

type Diary = Database['public']['Tables']['diaries']['Row'];

/** Loads the signed-in user's diaries and keeps the diary grid current after creation. */
export function useDiaries() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['diaries', user?.id] as const, [user?.id]);
  const initialDiaries = user?.id ? deviceStorage.peekDiaries<Diary>(user.id) : null;

  const diariesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const diaries = await DiaryService.getDiaries(user!.id);
      await deviceStorage.setDiaries(user!.id, diaries);
      return diaries;
    },
    enabled: Boolean(user?.id),
    initialData: initialDiaries ?? undefined,
    initialDataUpdatedAt: initialDiaries ? 0 : undefined,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!user?.id || initialDiaries) return;

    void deviceStorage.getDiaries<Diary>(user.id).then((cachedDiaries) => {
      if (!cachedDiaries?.length) return;
      queryClient.setQueryData<Diary[]>(queryKey, (current) => current ?? cachedDiaries);
    });
  }, [initialDiaries, queryClient, queryKey, user?.id]);

  const createDiaryMutation = useMutation({
    mutationFn: (input: CreateDiaryInput) => {
      if (!user?.id) throw new Error('Please sign in before creating a diary.');
      return DiaryService.createDiary(user.id, input);
    },
    onSuccess: (diary) => {
      queryClient.setQueryData<Diary[]>(queryKey, (current = []) => {
        const diaries = [...current, diary];
        if (user?.id) void deviceStorage.setDiaries(user.id, diaries);
        return diaries;
      });
    },
  });

  const updateDiaryMutation = useMutation({
    mutationFn: ({ diaryId, input }: { diaryId: string; input: CreateDiaryInput }) => {
      if (!user?.id) throw new Error('Please sign in before editing a diary.');
      return DiaryService.updateDiary(user.id, diaryId, input);
    },
    onMutate: async ({ diaryId, input }) => {
      const values = createDiarySchema.parse(input);
      await queryClient.cancelQueries({ queryKey });

      const previousDiaries = queryClient.getQueryData<Diary[]>(queryKey) ?? [];
      const optimisticDiaries = previousDiaries.map((diary) => diary.id === diaryId
        ? {
          ...diary,
          name: values.name,
          color: values.coverColor,
          cover_color: values.coverColor,
          style: values.style,
        }
        : diary);

      queryClient.setQueryData<Diary[]>(queryKey, optimisticDiaries);
      if (user?.id) void deviceStorage.setDiaries(user.id, optimisticDiaries);
      return { previousDiaries };
    },
    onError: (_error, _variables, context) => {
      if (!context?.previousDiaries) return;
      queryClient.setQueryData<Diary[]>(queryKey, context.previousDiaries);
      if (user?.id) void deviceStorage.setDiaries(user.id, context.previousDiaries);
    },
    onSuccess: (updatedDiary) => {
      queryClient.setQueryData<Diary[]>(queryKey, (current = []) => {
        const diaries = current.map((diary) => diary.id === updatedDiary.id ? updatedDiary : diary);
        if (user?.id) void deviceStorage.setDiaries(user.id, diaries);
        return diaries;
      });
    },
  });

  return {
    diaries: diariesQuery.data ?? [],
    isLoading: diariesQuery.isLoading,
    error: diariesQuery.error,
    createDiary: createDiaryMutation.mutateAsync,
    isCreating: createDiaryMutation.isPending,
    updateDiary: ({ diaryId, ...input }: CreateDiaryInput & { diaryId: string }) =>
      updateDiaryMutation.mutateAsync({ diaryId, input }),
    isUpdating: updateDiaryMutation.isPending,
  };
}

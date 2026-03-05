import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/providers/auth-provider';
import { ReportService } from '@/services/report-service';

interface CreateReportInput {
  entryId: string;
  reason: string;
}

interface UseReportedEntriesResult {
  reportedPostIds: string[];
  isLoadingReportedPosts: boolean;
  reportedPostsError: Error | null;
  createReport: (input: CreateReportInput) => void;
  createReportAsync: (input: CreateReportInput) => Promise<void>;
  isCreatingReport: boolean;
  createReportError: Error | null;
}

/**
 * Provides access to reported entry IDs and mutation helpers for creating reports.
 * Uses React Query for cached reads and optimistic mutation updates tied to the authenticated user.
 */
export function useReportedEntries(): UseReportedEntriesResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = ['reported-post-ids', user?.id];

  const {
    data: reportedPostIds = [],
    isLoading: isLoadingReportedPosts,
    error: reportedPostsError,
  } = useQuery<string[]>({
    queryKey,
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      return ReportService.getReportedPosts(user.id);
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async ({ entryId, reason }: CreateReportInput) => {
      if (!user?.id) {
        throw new Error('Missing user data for this report.');
      }

      await ReportService.createReport(user.id, entryId, reason);
    },
    onMutate: async ({ entryId }: CreateReportInput) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<string[]>(queryKey) || [];
      if (previous.includes(entryId)) {
        return { previous };
      }

      queryClient.setQueryData<string[]>(queryKey, [...previous, entryId]);
      return { previous };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData<string[]>(queryKey, context?.previous || []);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    reportedPostIds,
    isLoadingReportedPosts,
    reportedPostsError: reportedPostsError as Error | null,
    createReport: createReportMutation.mutate,
    createReportAsync: createReportMutation.mutateAsync,
    isCreatingReport: createReportMutation.isPending,
    createReportError: createReportMutation.error as Error | null,
  };
}

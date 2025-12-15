import { useQuery } from '@tanstack/react-query';
import { InviteService } from '@/services/invite-service';
import { Database } from '@/types/database';

type Invite = Database['public']['Tables']['invites']['Row'];

interface UseUserInviteResult {
  invite: Invite | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

export function useUserInvite(userId?: string): UseUserInviteResult {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['user-invite', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) {
        throw new Error('Missing user id');
      }
      return InviteService.getInvite(userId);
    },
  });

  return {
    invite: data,
    isLoading: isPending,
    isError,
    error,
    refetch,
  };
}



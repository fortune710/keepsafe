import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { useAuthContext } from '@/providers/auth-provider';
import { TimeCapsuleService } from '@/services/time-capsule-service';
import { TimeCapsuleWithEntry } from '@/types/time-capsule';
import { logger } from '@/lib/logger';

interface UseTimeCapsulesResult {
  capsules: TimeCapsuleWithEntry[];
  lockedCapsules: TimeCapsuleWithEntry[];
  pendingCapsules: TimeCapsuleWithEntry[];
  unlockedCapsules: TimeCapsuleWithEntry[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  requestRelease: (capsuleId: string) => Promise<{ success: boolean; message?: string }>;
  cancelRelease: (capsuleId: string) => Promise<{ success: boolean; message?: string }>;
  addOptimisticCapsule: (capsule: TimeCapsuleWithEntry) => void;
  removeOptimisticCapsule: (entryId: string) => void;
}

/**
 * Mirrors use-user-entries.ts's react-query + Realtime pattern, but without its
 * device-storage offline cache/pagination machinery - a user's time capsules are a small,
 * low-frequency list, so a plain query + realtime refetch is enough.
 */
export function useTimeCapsules(): UseTimeCapsulesResult {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();
  const queryKey = ['time-capsules', user?.id];

  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => TimeCapsuleService.listCapsules(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });

  const capsules = data || [];

  const setupSubscription = useCallback((userId: string) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const channel = supabase
      .channel(`time-capsules-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLES.TIME_CAPSULES },
        (payload) => {
          const newRow = payload.new as { user_id?: string } | null;
          const oldRow = payload.old as { user_id?: string } | null;
          if (newRow?.user_id !== userId && oldRow?.user_id !== userId) return;
          // A small, low-frequency list - refetch on any relevant change rather than
          // hand-rolling per-event cache surgery for every INSERT/UPDATE/DELETE shape.
          refetch();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          reconnectAttemptsRef.current = 0;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          logger.warn('Time capsule realtime subscription lost, reconnecting', { status });
          scheduleReconnect(userId);
        }
      });

    subscriptionRef.current = channel;
  }, [refetch]);

  const scheduleReconnect = useCallback((userId: string) => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      setupSubscription(userId);
    }, delay) as unknown as number;
  }, [setupSubscription]);

  useEffect(() => {
    if (!user?.id) return;
    setupSubscription(user.id);
    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectAttemptsRef.current = 0;
    };
  }, [user?.id, setupSubscription]);

  // Safety net in case a realtime event was missed while backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refetch();
    });
    return () => subscription.remove();
  }, [refetch]);

  const requestRelease = useCallback(async (capsuleId: string) => {
    const capsule = capsules.find((c) => c.id === capsuleId);
    if (!capsule) return { success: false, message: 'Time capsule not found' };

    queryClient.setQueryData<TimeCapsuleWithEntry[]>(queryKey, (old) =>
      (old || []).map((c) => (c.id === capsuleId ? { ...c, status: 'pending_release' } : c)),
    );

    const result = await TimeCapsuleService.requestRelease(capsuleId, capsule.reveal_type);
    if (!result.success) {
      refetch();
      return { success: false, message: result.error };
    }

    queryClient.setQueryData<TimeCapsuleWithEntry[]>(queryKey, (old) =>
      (old || []).map((c) =>
        c.id === capsuleId
          ? { ...c, status: 'pending_release', release_available_at: result.data!.release_available_at }
          : c,
      ),
    );
    return { success: true };
  }, [capsules, queryClient, queryKey, refetch]);

  const cancelRelease = useCallback(async (capsuleId: string) => {
    queryClient.setQueryData<TimeCapsuleWithEntry[]>(queryKey, (old) =>
      (old || []).map((c) =>
        c.id === capsuleId
          ? { ...c, status: 'locked', release_available_at: null, release_requested_at: null }
          : c,
      ),
    );

    const result = await TimeCapsuleService.cancelRelease(capsuleId);
    if (!result.success) {
      refetch();
      return { success: false, message: result.error };
    }
    return { success: true };
  }, [queryClient, queryKey, refetch]);

  const addOptimisticCapsule = useCallback((capsule: TimeCapsuleWithEntry) => {
    queryClient.setQueryData<TimeCapsuleWithEntry[]>(queryKey, (old) => [capsule, ...(old || [])]);
  }, [queryClient, queryKey]);

  const removeOptimisticCapsule = useCallback((entryId: string) => {
    queryClient.setQueryData<TimeCapsuleWithEntry[]>(queryKey, (old) =>
      (old || []).filter((c) => c.entry_id !== entryId),
    );
  }, [queryClient, queryKey]);

  return {
    capsules,
    lockedCapsules: capsules.filter((c) => c.status === 'locked'),
    pendingCapsules: capsules.filter((c) => c.status === 'pending_release'),
    unlockedCapsules: capsules.filter((c) => c.status === 'unlocked'),
    isLoading,
    error: error as Error | null,
    refetch,
    requestRelease,
    cancelRelease,
    addOptimisticCapsule,
    removeOptimisticCapsule,
  };
}

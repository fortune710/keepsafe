import { supabase } from '@/lib/supabase';
import { TABLES } from '@/constants/supabase';
import { Database } from '@/types/database';
import { TimeCapsuleWithEntry, TimeCapsuleDraft } from '@/types/time-capsule';
import { logger } from '@/lib/logger';
import { posthog } from '@/constants/posthog';
import { StreakService } from './streak-service';
import { capsuleDraftSchema, capsuleEntrySchema } from '@/lib/validations/time-capsules';

type TimeCapsuleInsert = Database['public']['Tables']['time_capsules']['Insert'];

export type { TimeCapsuleDraft };

export interface TimeCapsuleServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * All calls here go straight to Supabase - creation/listing are plain table access
 * (RLS-enforced), and the two state transitions that must resist client tampering
 * (request/cancel release) go through security-definer RPC functions rather than a
 * backend HTTP endpoint. See the time-capsule plan for why.
 */
export class TimeCapsuleService {
  static async createEntryAndCapsule(entry: Database['public']['Tables']['entries']['Insert'], draft: TimeCapsuleDraft): Promise<TimeCapsuleServiceResult<Database['public']['Tables']['entries']['Row']>> {
    const validation = capsuleEntrySchema.safeParse(entry);
    const validDraft = capsuleDraftSchema.safeParse(draft);
    if (!validation.success || !validDraft.success) return { success: false, error: 'Invalid time capsule details' };
    const capsule = { reveal_type: draft.revealType, unlock_at: draft.revealType === 'date' ? draft.unlockAt : null, condition_label: draft.revealType === 'condition' ? draft.conditionLabel : null };
    const { data, error } = await (supabase.rpc as any)('create_entry_time_capsule', { p_entry: entry, p_capsule: capsule });
    if (error || !data?.entry) {
      logger.error('time_capsule_create_failed', { entryId: entry.id, errorCode: error?.code });
      return { success: false, error: 'Failed to save time capsule' };
    }
    if (data.created) {
      try {
        const streak = await StreakService.loadStreakData(entry.user_id);
        await StreakService.updateStreak(entry.user_id, new Date(data.entry.created_at), streak);
      } catch (error) { logger.warn('Unable to update streak', error); }
      posthog.capture('time_capsule_created', { reveal_type: draft.revealType });
    }
    return { success: true, data: data.entry };
  }
  static async listCapsules(userId: string): Promise<TimeCapsuleWithEntry[]> {
    const { data, error } = await supabase
      .from(TABLES.TIME_CAPSULES)
      .select(`*, entry:${TABLES.ENTRIES}(*, profile:${TABLES.PROFILES}(*))`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error('time_capsule_list_failed', { userId, errorCode: error.code });
      throw new Error(error.message);
    }

    return (data || []) as unknown as TimeCapsuleWithEntry[];
  }

  static async createCapsule(
    entryId: string,
    userId: string,
    draft: TimeCapsuleDraft,
    clientOpId?: string,
  ): Promise<TimeCapsuleServiceResult<TimeCapsuleWithEntry>> {
    const insertData: TimeCapsuleInsert = {
      entry_id: entryId,
      user_id: userId,
      reveal_type: draft.revealType,
      unlock_at: draft.revealType === 'date' ? draft.unlockAt : null,
      condition_label: draft.revealType === 'condition' ? draft.conditionLabel : null,
    };

    const { data, error } = await supabase
      .from(TABLES.TIME_CAPSULES)
      .insert(insertData as any)
      .select(`*, entry:${TABLES.ENTRIES}(*, profile:${TABLES.PROFILES}(*))`)
      .single();

    if (error) {
      logger.error('time_capsule_create_failed', {
        entryId,
        revealType: draft.revealType,
        errorCode: error.code,
        clientOpId,
      });
      return { success: false, error: error.message };
    }

    posthog.capture('time_capsule_created', { reveal_type: draft.revealType });

    return { success: true, data: data as unknown as TimeCapsuleWithEntry };
  }

  static async requestRelease(
    capsuleId: string,
    revealType: 'date' | 'condition',
    clientOpId?: string,
  ): Promise<TimeCapsuleServiceResult<{ release_available_at: string }>> {
    const { data, error } = await (supabase.rpc as any)('request_time_capsule_release', {
      p_capsule_id: capsuleId,
    });

    if (error) {
      logger.error('time_capsule_release_request_failed', {
        capsuleId,
        errorCode: error.code,
        clientOpId,
      });
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; message?: string; release_available_at?: string } | null;
    if (!result?.success) {
      logger.error('time_capsule_release_request_rejected', { capsuleId, clientOpId });
      return { success: false, error: result?.message || 'Unable to request release' };
    }

    posthog.capture('time_capsule_release_requested', { reveal_type: revealType });

    return { success: true, data: { release_available_at: result.release_available_at! } };
  }

  static async cancelRelease(
    capsuleId: string,
    clientOpId?: string,
  ): Promise<TimeCapsuleServiceResult> {
    const { data, error } = await (supabase.rpc as any)('cancel_time_capsule_release', {
      p_capsule_id: capsuleId,
    });

    if (error) {
      logger.error('time_capsule_release_cancel_failed', {
        capsuleId,
        errorCode: error.code,
        clientOpId,
      });
      return { success: false, error: error.message };
    }

    const result = data as { success?: boolean; message?: string } | null;
    if (!result?.success) {
      logger.error('time_capsule_release_cancel_rejected', { capsuleId, clientOpId });
      return { success: false, error: result?.message || 'Unable to cancel release' };
    }

    posthog.capture('time_capsule_release_cancelled');

    return { success: true };
  }
}

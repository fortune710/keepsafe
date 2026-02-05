import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PhoneNumberUpdateRecord {
  id: string;
  user_id: string;
  phone_number: string;
  otp_hash: string;
  created_at: string;
}

interface UsePhoneNumberUpdateRecordResult {
  /** Current record if present, otherwise null. */
  record: PhoneNumberUpdateRecord | null;
  /** Whether a fetch is currently in-flight. */
  loading: boolean;
  /** Fetch the record. Returns null if no record exists. */
  refresh: () => Promise<PhoneNumberUpdateRecord | null>;
}

/**
 * Fetch the current user's `phone_number_updates` record.
 *
 * Important: This uses `maybeSingle()` so it returns `null` instead of throwing when no row exists.
 */
export function usePhoneNumberUpdateRecord(userId?: string): UsePhoneNumberUpdateRecordResult {
  const [record, setRecord] = useState<PhoneNumberUpdateRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setRecord(null);
      return null;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('phone_number_updates')
        .select('id,user_id,phone_number,otp_hash,created_at')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      const next = (data as PhoneNumberUpdateRecord | null) ?? null;
      setRecord(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Best-effort initial load when userId becomes available.
    refresh().catch(() => {});
  }, [refresh]);

  return { record, loading, refresh };
}


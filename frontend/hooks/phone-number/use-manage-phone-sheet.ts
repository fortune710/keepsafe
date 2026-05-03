import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/auth-provider';
import { getPhonePromptState } from '@/services/phone-number-prompt-service';
import { TABLES } from '@/constants/supabase';

export function useManagePhoneSheet() {
    const { user } = useAuthContext();
    const [showPhoneSheet, setShowPhoneSheet] = useState(false);
    const { profile } = useAuthContext();

    useEffect(() => {
        let cancelled = false;

        const checkShouldShowPhonePrompt = async () => {
            if (!user?.id) return;
            if (profile?.phone_number) {
                if (!cancelled) setShowPhoneSheet(false);
                return;
            }

            // If the user already has a pending OTP record, always show the sheet.
            const { data: pendingRecord } = await supabase
                .from(TABLES.PHONE_NUMBER_UPDATES)
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle() as { data: { id: string } | null };

            if (pendingRecord?.id) {
                if (!cancelled) setShowPhoneSheet(true);
                return;
            }

            const state = await getPhonePromptState(user.id);
            const now = Date.now();
            const shouldShow = !state.dontAskAgain && (!state.nextPromptAtMs || now >= state.nextPromptAtMs);

            if (!cancelled) setShowPhoneSheet(shouldShow);
        };

        checkShouldShowPhonePrompt().catch(() => { });
        return () => {
            cancelled = true;
        };
    }, [profile?.phone_number, user?.id]);

    return {
        showPhoneSheet,
        setShowPhoneSheet
    }
}
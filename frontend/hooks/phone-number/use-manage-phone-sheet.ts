import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/providers/auth-provider';
import { getPhonePromptState } from '@/services/phone-number-prompt-service';
import { TABLES } from '@/constants/supabase';
import { useFeatureFlag, FEATURE_FLAGS } from '@/hooks/posthog/use-feature-flag';

export function useManagePhoneSheet() {
    const { user, profile } = useAuthContext();
    const [showPhoneSheet, setShowPhoneSheet] = useState(false);
    const hidePhoneSheetFlag = useFeatureFlag(FEATURE_FLAGS.HIDE_PHONE_NUMBER_SHEET);
    const {
        data: pendingRecord,
        isPending: isPendingPhoneUpdates,
        isError: isPhoneUpdatesError
    } = useQuery({
        queryKey: ['phone_updates', user?.id],
        enabled: !!user?.id,
        queryFn: async () => {
            if (!user?.id) {
                throw new Error('Missing user id');
            }

            const { data } = await supabase
                .from(TABLES.PHONE_NUMBER_UPDATES)
                .select('id')
                .eq('user_id', user.id)
                .maybeSingle() as { data: { id: string } | null };

            return data;
        },
    });

    useEffect(() => {
        let cancelled = false;

        const checkShouldShowPhonePrompt = async () => {
            if (!user?.id) {
                if (!cancelled) setShowPhoneSheet(false);
                return;
            }

            if (isPendingPhoneUpdates || isPhoneUpdatesError) {
                return;
            }

            if (profile?.phone_number) {
                if (!cancelled) setShowPhoneSheet(false);
                return;
            }

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
    }, [isPendingPhoneUpdates, isPhoneUpdatesError, pendingRecord, profile?.phone_number, user?.id]);

    return {
        showPhoneSheet: hidePhoneSheetFlag ? false : showPhoneSheet,
        setShowPhoneSheet
    }
}

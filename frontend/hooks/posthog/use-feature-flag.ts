import { useEffect, useState } from 'react';
import { posthog } from '@/constants/posthog';

/**
 * Hook to check if a PostHog feature flag is enabled.
 * Returns true if enabled, false otherwise.
 * 
 * @param flagName The name of the feature flag to check
 * @returns boolean indicating if the flag is enabled
 */
export function useFeatureFlag(flagName: string): boolean {
    const [isEnabled, setIsEnabled] = useState(() => !!posthog.getFeatureFlag(flagName));

    useEffect(() => {
        setIsEnabled(!!posthog.getFeatureFlag(flagName));

        const unsubscribe =
            typeof posthog.onFeatureFlags === 'function'
                ? posthog.onFeatureFlags(() => {
                    setIsEnabled(!!posthog.getFeatureFlag(flagName));
                })
                : undefined;

        return () => {
            if (typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [flagName]);

    return isEnabled;
}

/**
 * Constants for common feature flag names
 */
export const FEATURE_FLAGS = {
    HIDE_PHONE_NUMBER_SHEET: 'phone-number-sheet',
} as const;

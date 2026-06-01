import { useFeatureFlag as usePostHogFeatureFlag } from 'posthog-react-native';

/**
 * Hook to check if a PostHog feature flag is enabled.
 * Returns true if enabled, false otherwise.
 * 
 * @param flagName The name of the feature flag to check
 * @returns boolean indicating if the flag is enabled
 */
export function useFeatureFlag(flagName: string): boolean {
    const isEnabled = usePostHogFeatureFlag(flagName);
    return !!isEnabled;
}

/**
 * Constants for common feature flag names
 */
export const FEATURE_FLAGS = {
    HIDE_PHONE_NUMBER_SHEET: 'phone-number-sheet',
} as const;
